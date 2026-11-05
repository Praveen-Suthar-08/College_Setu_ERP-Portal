import React, { useState, useMemo, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Share2,
  Calendar,
  Search,
  BookOpen,
  Award,
  Clock,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import {
  Examination,
  StudentGradeCard,
  StudentRecord,
  Subject,
  Profile,
  UserRole,
} from '../../../types/portal';
import { Badge, Button, GlassCard, Input, ModalDialog, Select } from '../../ui/DesignSystem';
import { generatePublishedExamResultPDF, generateReportCardPDF } from '../../../utils/pdfGenerator';

interface ExaminationsAndGradeCardsModuleProps {
  role: UserRole;
  profile?: Profile;
  currentProfile?: Profile;
  students: StudentRecord[];
  subjects: Subject[];
  examinations?: Examination[];
  gradeCards?: StudentGradeCard[];
  onSaveExamination?: (exam: Examination | any) => Promise<void> | void;
  onPublishExamination?: (examId: string, status: any) => Promise<void> | void;
  onSaveGradeCards?: (cards: StudentGradeCard[]) => Promise<void> | void;
  onToast: (msg: string) => void;
}

export const ExaminationsAndGradeCardsModule: React.FC<ExaminationsAndGradeCardsModuleProps> = ({
  role,
  profile: propProfile,
  currentProfile: propCurrentProfile,
  students = [],
  subjects = [],
  examinations = [],
  gradeCards = [],
  onSaveExamination,
  onPublishExamination,
  onSaveGradeCards,
  onToast,
}) => {
  const profile = propCurrentProfile || propProfile || ({} as Profile);
  const isTeacherOrOrganizer = ['faculty', 'hod', 'super_admin', 'admin'].includes(role);
  const collegeCode = (profile.college_code || '').trim().toUpperCase();

  // Filter exams for this college
  const collegeExams = useMemo(() => {
    return examinations.filter((e) => {
      if (!collegeCode) return true;
      return (e.college_code || '').trim().toUpperCase() === collegeCode;
    });
  }, [examinations, collegeCode]);

  const lastPdfDownloadRef = useRef<number>(0);

  // Student's published exams and grade cards (strictly only published)
  const studentExams = useMemo(() => {
    return collegeExams.filter((e) => e.status === 'published' || e.is_published === true);
  }, [collegeExams]);

  // Authoritative student matching for authenticated student role (no fallback to other students)
  const currentStudent = useMemo(() => {
    const found = students.find(
      (s) =>
        s.profile_id === profile.id ||
        s.id === profile.id ||
        (s.email && s.email.trim().toLowerCase() === profile.email.trim().toLowerCase())
    );
    if (found) return found;
    if (profile.role === 'student') {
      return {
        id: profile.id,
        profile_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone || '',
        enrolment_no: profile.identifier_no || profile.username || '26STU' + profile.id.slice(0, 4).toUpperCase(),
        batch_id: 'batch-2026',
        batch_label: 'Class 2026',
        department_id: 'dept-cse',
        department_code: profile.department || 'CSE',
        current_semester: 1,
        guardian_name: profile.emergency_contact || '',
        mentor_id: '',
        attendance_pct: 100,
        cgpa: 0,
        sgpa: 0,
        fee_status: 'paid' as const,
        college_code: profile.college_code,
      };
    }
    return null;
  }, [students, profile]);

  // Modal states
  const [createExamModalOpen, setCreateExamModalOpen] = useState(false);
  const [marksEntryExam, setMarksEntryExam] = useState<Examination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New Examination Form State
  const [examTitle, setExamTitle] = useState('');
  const [examSubject, setExamSubject] = useState(subjects[0]?.name || 'Data Structures & Algorithms');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [examDept, setExamDept] = useState(profile.department || 'CSE');
  const [examSemester, setExamSemester] = useState(6);
  const [maxMarks, setMaxMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(40);
  const [savingExam, setSavingExam] = useState(false);

  // Marks Entry State: map of studentId -> marks
  const [marksState, setMarksState] = useState<Record<string, number>>({});

  const handleOpenMarksEntry = (exam: Examination) => {
    setMarksEntryExam(exam);
    // Preload existing marks for this exam
    const existingForExam = gradeCards.filter((gc) => gc.exam_id === exam.id);
    const initialMarks: Record<string, number> = {};
    existingForExam.forEach((gc) => {
      initialMarks[gc.student_id] = gc.marks_obtained;
    });
    setMarksState(initialMarks);
  };

  const calculateGrade = (obtained: number, max: number): { grade: string; points: number; passed: boolean } => {
    const pct = (obtained / (max || 100)) * 100;
    if (pct >= 90) return { grade: 'O', points: 10, passed: true };
    if (pct >= 80) return { grade: 'A+', points: 9, passed: true };
    if (pct >= 70) return { grade: 'A', points: 8, passed: true };
    if (pct >= 60) return { grade: 'B+', points: 7, passed: true };
    if (pct >= 50) return { grade: 'B', points: 6, passed: true };
    if (pct >= passMarks) return { grade: 'C', points: 5, passed: true };
    return { grade: 'F', points: 0, passed: false };
  };

  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      onToast('Please enter an examination title.');
      return;
    }
    setSavingExam(true);
    try {
      const newExam: Partial<Examination> = {
        title: examTitle.trim(),
        subject: examSubject,
        exam_date: examDate,
        department: examDept,
        semester: Number(examSemester),
        max_marks: Number(maxMarks),
        pass_marks: Number(passMarks),
        status: 'draft',
        college_code: collegeCode,
        created_by_id: profile.id,
        created_by_name: profile.full_name,
      };

      if (onSaveExamination) {
        await onSaveExamination(newExam);
      }
      setCreateExamModalOpen(false);
      setExamTitle('');
      onToast(`Examination "${examTitle}" created successfully. You can now enter student marks.`);
    } catch {
      onToast('Failed to create examination.');
    } finally {
      setSavingExam(false);
    }
  };

  const handleSaveMarksSubmit = async () => {
    if (!marksEntryExam) return;
    const cardsToSave: StudentGradeCard[] = students.map((stu) => {
      const marks = marksState[stu.id] !== undefined ? marksState[stu.id] : 0;
      const { grade, points, passed } = calculateGrade(marks, marksEntryExam.max_marks);
      return {
        id: `gc-${marksEntryExam.id}-${stu.id}`,
        exam_id: marksEntryExam.id,
        student_id: stu.id,
        student_name: stu.full_name,
        enrolment_no: stu.enrolment_no,
        subject: marksEntryExam.subject,
        marks_obtained: marks,
        max_marks: marksEntryExam.max_marks,
        grade,
        grade_points: points,
        result_status: passed ? 'Pass' : 'Fail',
        college_code: collegeCode,
        published: marksEntryExam.status === 'published',
      };
    });

    if (onSaveGradeCards) {
      await onSaveGradeCards(cardsToSave);
    }
    setMarksEntryExam(null);
    onToast(`Saved marks and updated grade cards for ${cardsToSave.length} students.`);
  };

  const handleTogglePublish = async (exam: Examination) => {
    const nextStatus = exam.status === 'published' ? 'draft' : 'published';
    if (onPublishExamination) {
      await onPublishExamination(exam.id, nextStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[20px] border border-[var(--border)] bg-surface p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-accent">
              <GraduationCap className="h-3.5 w-3.5" />
              Office of Academic Examinations &amp; Grade Registry
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-ink">
              Examinations &amp; Official Grade Cards
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {isTeacherOrOrganizer
                ? 'Create formal examinations, enter student marks, calculate automated grades, and publish official grade cards.'
                : 'Review your scheduled examinations, verified marks, and download official grade cards.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isTeacherOrOrganizer && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCreateExamModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Examination
              </Button>
            )}
            {role === 'student' && currentStudent && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  generateReportCardPDF(
                    currentStudent,
                    subjects,
                    currentStudent.current_semester || 6,
                    profile.college_name || 'Autonomous Institution',
                    collegeCode
                  );
                  onToast('Generated official Statement of Grades PDF.');
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Full Grade Card (PDF)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TEACHER & ORGANIZER VIEW: Examination Directory & Grade Card Management */}
      {isTeacherOrOrganizer && (
        <div className="space-y-6">
          <GlassCard padding="lg" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--glass-border-subtle)] pb-4">
              <div>
                <h2 className="font-editorial text-xl font-bold text-ink">
                  Scheduled Examinations ({collegeExams.length})
                </h2>
                <p className="text-xs text-muted">
                  Departmental examinations and grade cards for college code [{collegeCode || 'ALL'}]
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Filter by title or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-2 py-2 pl-9 pr-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {collegeExams.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                No examinations created yet. Click &quot;Create Examination&quot; to schedule your first exam and enter marks.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {collegeExams
                  .filter((e) =>
                    !searchQuery ||
                    (e.title || e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (e.subject || e.subject_name || e.subject_code || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((exam) => {
                    const examCards = gradeCards.filter((gc) => gc.exam_id === exam.id);
                    const isPublished = exam.status === 'published';

                    return (
                      <div
                        key={exam.id}
                        className="flex flex-col justify-between rounded-[16px] border border-[var(--glass-border)] bg-surface-2/60 p-5 space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-editorial text-lg font-bold text-ink">
                                {exam.title}
                              </h3>
                              <p className="text-xs font-semibold text-accent">
                                Subject: {exam.subject}
                              </p>
                            </div>
                            <Badge tone={isPublished ? 'success' : 'warning'} dot>
                              {isPublished ? 'Published to Students' : 'Draft / Unpublished'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted rounded-xl bg-surface border border-line p-2.5">
                            <div>
                              <span className="text-muted block">Date:</span>
                              <span className="font-semibold text-ink">{exam.exam_date}</span>
                            </div>
                            <div>
                              <span className="text-muted block">Department:</span>
                              <span className="font-semibold text-ink">{exam.department}</span>
                            </div>
                            <div>
                              <span className="text-muted block">Max Marks:</span>
                              <span className="font-semibold text-ink">{exam.max_marks}</span>
                            </div>
                            <div>
                              <span className="text-muted block">Pass Marks:</span>
                              <span className="font-semibold text-ink">{exam.pass_marks}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-border-subtle)] pt-3">
                          <span className="text-xs text-muted">
                            {examCards.length > 0
                              ? `${examCards.length} student marks recorded`
                              : 'No marks entered yet'}
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenMarksEntry(exam)}
                              className="gap-1.5"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Enter Marks
                            </Button>

                            <Button
                              variant={isPublished ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => handleTogglePublish(exam)}
                              className="gap-1.5"
                            >
                              {isPublished ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5" />
                                  Publish Grade Cards
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* STUDENT & PARENT VIEW: Published Grade Cards & Exam Results */}
      {!isTeacherOrOrganizer && (
        <div className="space-y-6">
          <GlassCard padding="lg" className="space-y-4">
            <div className="border-b border-[var(--glass-border-subtle)] pb-3">
              <h2 className="font-editorial text-xl font-bold text-ink">
                Your Published Examination Results
              </h2>
              <p className="text-xs text-muted">
                Official marks verified by faculty and published by the Controller of Examinations
              </p>
            </div>

            {studentExams.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                No examination results have been published for your class yet. Published examinations will appear here automatically in real time.
              </div>
            ) : (
              <div className="space-y-3">
                {studentExams.map((exam) => {
                  const studentCard = gradeCards.find(
                    (gc) =>
                      gc.exam_id === exam.id &&
                      (gc.student_id === currentStudent?.id ||
                        gc.enrolment_no === currentStudent?.enrolment_no)
                  );

                  const marksObtained = studentCard ? studentCard.marks_obtained : 0;
                  const passMarks = exam.pass_marks ?? exam.passing_marks ?? 40;
                  const isPassed = marksObtained >= passMarks;
                  const grade = studentCard ? studentCard.grade : isPassed ? 'Pass' : 'Fail';

                  return (
                    <GlassCard
                      key={exam.id}
                      padding="md"
                      className="transition-all hover:border-accent"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-editorial text-base sm:text-lg font-bold text-ink break-words">
                              {exam.title || exam.name}
                            </h3>
                            <Badge tone={isPassed ? 'success' : 'danger'} dot>
                              {isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            <span className="text-ink font-medium">
                              Subject: <strong className="text-accent">{exam.subject || exam.subject_name}</strong>
                            </span>
                            <span>•</span>
                            <span>Date: <strong className="text-ink font-mono">{exam.exam_date}</strong></span>
                            <span>•</span>
                            <span>Dept: <strong className="text-ink">{exam.department || 'CSE'}</strong></span>
                            <span>•</span>
                            <span>Pass Mark: <strong className="text-ink font-mono">{passMarks}</strong></span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-line/40 shrink-0">
                          <div className="text-left md:text-right">
                            <div className="font-editorial text-xl sm:text-2xl font-bold text-accent tabular-nums">
                              {marksObtained} <span className="text-sm font-normal text-muted">/ {exam.max_marks}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted font-mono justify-start md:justify-end mt-0.5">
                              <span>Grade:</span>
                              <Badge tone={isPassed ? 'success' : 'danger'}>{grade}</Badge>
                              <span className="text-[11px] tabular-nums">
                                ({((marksObtained / (exam.max_marks || 100)) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>

                          {currentStudent && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const now = Date.now();
                                if (now - lastPdfDownloadRef.current < 1000) return;
                                lastPdfDownloadRef.current = now;

                                generatePublishedExamResultPDF(
                                  currentStudent,
                                  exam,
                                  studentCard,
                                  gradeCards,
                                  profile.college_name || 'Autonomous Institution',
                                  collegeCode
                                );
                                onToast(`Downloaded official examination results PDF for ${exam.name || exam.title}.`);
                              }}
                              className="shrink-0 gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download PDF</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* MODAL 1: CREATE EXAMINATION */}
      {createExamModalOpen && (
        <ModalDialog
          open={createExamModalOpen}
          onClose={() => setCreateExamModalOpen(false)}
          title="Create New Examination"
          description="Schedule a formal institutional examination with passing threshold and max marks."
        >
          <form onSubmit={handleCreateExamSubmit} className="space-y-4">
            <Input
              label="Examination Title *"
              placeholder="e.g. Mid-Term Examination Fall 2026"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Subject *</label>
                <select
                  value={examSubject}
                  onChange={(e) => setExamSubject(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {subjects.length > 0 ? (
                    subjects.map((s) => (
                      <option key={s.id || s.code} value={s.name}>
                        {s.code} · {s.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Data Structures & Algorithms">Data Structures &amp; Algorithms</option>
                      <option value="Operating Systems">Operating Systems</option>
                      <option value="Database Management Systems">Database Management Systems</option>
                      <option value="Computer Networks">Computer Networks</option>
                    </>
                  )}
                </select>
              </div>

              <Input
                label="Examination Date *"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Department"
                value={examDept}
                onChange={(e) => setExamDept(e.target.value)}
              />
              <Input
                label="Maximum Marks *"
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                required
              />
              <Input
                label="Passing Marks *"
                type="number"
                value={passMarks}
                onChange={(e) => setPassMarks(Number(e.target.value))}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setCreateExamModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={savingExam}>
                {savingExam ? 'Saving...' : 'Create Examination'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* MODAL 2: ENTER STUDENT MARKS */}
      {marksEntryExam && (
        <ModalDialog
          open={Boolean(marksEntryExam)}
          onClose={() => setMarksEntryExam(null)}
          maxWidth="2xl"
          title={`Enter Marks · ${marksEntryExam.title}`}
          description={`Subject: ${marksEntryExam.subject} · Maximum Marks: ${marksEntryExam.max_marks} (Passing: ${marksEntryExam.pass_marks})`}
        >
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2.5">Student</th>
                    <th className="py-2.5">Enrolment No</th>
                    <th className="py-2.5 w-28">Marks (/{marksEntryExam.max_marks})</th>
                    <th className="py-2.5">Grade</th>
                    <th className="py-2.5">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border-subtle)]">
                  {students.map((stu) => {
                    const curMarks = marksState[stu.id] !== undefined ? marksState[stu.id] : 0;
                    const { grade, passed } = calculateGrade(curMarks, marksEntryExam.max_marks);

                    return (
                      <tr key={stu.id} className="hover:bg-surface/30">
                        <td className="py-2 font-medium text-ink">{stu.full_name}</td>
                        <td className="py-2 font-mono text-muted">{stu.enrolment_no}</td>
                        <td className="py-2">
                          <input
                            type="number"
                            min="0"
                            max={marksEntryExam.max_marks}
                            value={curMarks}
                            onChange={(e) => {
                              const val = Math.min(
                                marksEntryExam.max_marks,
                                Math.max(0, Number(e.target.value))
                              );
                              setMarksState((prev) => ({ ...prev, [stu.id]: val }));
                            }}
                            className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                          />
                        </td>
                        <td className="py-2 font-bold font-mono text-accent">{grade}</td>
                        <td className="py-2">
                          <Badge tone={passed ? 'success' : 'danger'}>
                            {passed ? 'Pass' : 'Fail'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-muted">
                Grades and points are calculated automatically using the UGC 10-point scale.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="md" onClick={() => setMarksEntryExam(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleSaveMarksSubmit}>
                  Save Marks &amp; Grade Cards
                </Button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
};
