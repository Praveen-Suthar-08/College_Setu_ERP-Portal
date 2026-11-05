import React from 'react';
import { CheckCircle2, Download, Printer, X } from 'lucide-react';
import { PaymentRecord } from '../../../types/portal';
import { formatPaiseToINR } from '../../../utils/finance';
import { generateFeeReceiptPDF } from '../../../utils/pdfGenerator';
import { Badge, Button, ModalDialog } from '../../ui/DesignSystem';

interface FeeReceiptModalProps {
  payment: PaymentRecord | null;
  onClose: () => void;
  collegeName?: string;
  collegeCode?: string;
  onReverse?: (p: PaymentRecord) => void;
  onToast: (msg: string) => void;
}

export const FeeReceiptModal: React.FC<FeeReceiptModalProps> = ({
  payment,
  onClose,
  collegeName = 'Institution Workspace',
  collegeCode = '',
  onReverse,
  onToast,
}) => {
  if (!payment) return null;

  return (
    <ModalDialog
      open={Boolean(payment)}
      onClose={onClose}
      maxWidth="xl"
      title={`Fee Receipt · ${payment.receipt_no}`}
      description="Official digitally verified transaction receipt with real-time UPI reference."
    >
      <div className="space-y-6">
        {/* Printable Receipt Card */}
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] p-6 space-y-6 print:bg-white print:text-black">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
            <div>
              <div className="font-editorial text-lg font-bold text-ink">
                {collegeName.toUpperCase()}
              </div>
              <div className="text-xs text-muted">
                Office of Finance &amp; Accounts · Verified Real-Time Receipt
              </div>
            </div>
            <Badge tone={payment.reversed_of ? 'danger' : 'success'} dot>
              {payment.reversed_of ? 'Reversed Transaction' : 'Verified & Credited'}
            </Badge>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] p-4 text-xs">
            <div>
              <div className="text-muted">Receipt Number</div>
              <div className="mt-0.5 font-mono font-bold text-accent">{payment.receipt_no}</div>
            </div>
            <div>
              <div className="text-muted">Transaction Date</div>
              <div className="mt-0.5 font-mono font-semibold text-ink">
                {new Date(payment.created_at).toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-muted">Payment Mode</div>
              <div className="mt-0.5 font-mono font-semibold uppercase text-ink">
                {payment.mode}
              </div>
            </div>
            <div>
              <div className="text-muted">Amount Paid</div>
              <div className="mt-0.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {formatPaiseToINR(payment.amount_paise)}
              </div>
            </div>
          </div>

          {/* Student & Particulars */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-ink uppercase tracking-wider">
              Student &amp; Fee Particulars
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-muted">Student Full Name</div>
                <div className="mt-0.5 font-semibold text-ink">{payment.student_name}</div>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-muted">Enrolment / Roll Number</div>
                <div className="mt-0.5 font-mono font-semibold text-accent">{payment.enrolment_no}</div>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-muted">Fee Head / Description</div>
                <div className="mt-0.5 font-semibold text-ink">{payment.fee_title}</div>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="text-muted">UPI / Bank Reference No.</div>
                <div className="mt-0.5 font-mono font-semibold text-ink">
                  {payment.reference || 'UPI-REF-VERIFIED'}
                </div>
              </div>
            </div>
          </div>

          {/* Verification Footer Stamp */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4 text-xs text-muted">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Digitally Sealed &amp; Recorded by {payment.recorded_by_name || 'System Auto-Ledger'}</span>
            </div>
            <span className="font-mono">ID: {payment.id}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <div>
            {!payment.reversed_of && onReverse && payment.amount_paise > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onReverse(payment);
                  onClose();
                }}
              >
                Issue Ledger Reversal
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.print();
                onToast('Opened print preview for receipt.');
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              Print Receipt
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                generateFeeReceiptPDF(payment, collegeName, collegeCode);
                onToast(`Downloaded official PDF receipt for ${payment.student_name}.`);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};
