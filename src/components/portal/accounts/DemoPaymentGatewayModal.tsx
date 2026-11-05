import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  QrCode, 
  Building2, 
  Smartphone, 
  CheckCircle2, 
  Download, 
  Printer, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { FeeAssignment, PaymentRecord } from '../../../types/portal';
import { formatPaiseToINR, rupeesToPaise } from '../../../utils/finance';
import { generateFeeReceiptPDF } from '../../../utils/pdfGenerator';
import { Badge, Button, ModalDialog, Input, Select } from '../../ui/DesignSystem';

export interface DemoPaymentGatewayModalProps {
  open: boolean;
  onClose: () => void;
  feeAssignments: FeeAssignment[];
  payments: PaymentRecord[];
  initialAssignmentId?: string;
  studentId: string;
  studentName: string;
  enrolmentNo: string;
  collegeName?: string;
  collegeCode?: string;
  onRecordPayment: (
    assignmentId: string,
    amountPaise: number,
    mode: PaymentRecord['mode'],
    reference: string
  ) => void;
  onToast: (msg: string) => void;
}

type PaymentGatewayMode = 'upi_qr' | 'card' | 'net_banking' | 'neft' | 'cash';

export const DemoPaymentGatewayModal: React.FC<DemoPaymentGatewayModalProps> = ({
  open,
  onClose,
  feeAssignments,
  payments,
  initialAssignmentId,
  studentId,
  studentName,
  enrolmentNo,
  collegeName = 'Institution Workspace',
  collegeCode = '',
  onRecordPayment,
  onToast,
}) => {
  // Available unpaid or partially paid assignments
  const unpaidAssignments = useMemo(() => {
    return feeAssignments.filter((f) => {
      const netPrincipal = f.amount_paise - (f.concession_paise || 0);
      const paid = f.paid_paise || 0;
      return (
        paid < netPrincipal &&
        (f.student_id === studentId || f.enrolment_no === enrolmentNo || f.student_name === studentName)
      );
    });
  }, [feeAssignments, studentId, enrolmentNo, studentName]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(() => {
    if (initialAssignmentId && unpaidAssignments.some((a) => a.id === initialAssignmentId)) {
      return initialAssignmentId;
    }
    return unpaidAssignments[0]?.id || '';
  });

  const activeAssignment = useMemo(() => {
    return (
      unpaidAssignments.find((a) => a.id === selectedAssignmentId) ||
      feeAssignments.find((a) => a.id === selectedAssignmentId) ||
      unpaidAssignments[0]
    );
  }, [unpaidAssignments, feeAssignments, selectedAssignmentId]);

  const maxOutstandingPaise = useMemo(() => {
    if (!activeAssignment) return 0;
    const net = activeAssignment.amount_paise - (activeAssignment.concession_paise || 0);
    return Math.max(0, net - (activeAssignment.paid_paise || 0));
  }, [activeAssignment]);

  const [payType, setPayType] = useState<'full' | 'partial'>('full');
  const [customAmountRupees, setCustomAmountRupees] = useState<string>('');
  const [activeMode, setActiveMode] = useState<PaymentGatewayMode>('upi_qr');

  // Mode Specific Form State
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'cred'>('gpay');
  const [upiIdInput, setUpiIdInput] = useState('student@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 8920 1204 8821');
  const [cardHolder, setCardHolder] = useState(studentName || 'CAMPUS STUDENT');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('834');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [neftRef, setNeftRef] = useState('');

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [completedPayment, setCompletedPayment] = useState<PaymentRecord | null>(null);

  // Calculate actual paise to pay
  const amountToPayPaise = useMemo(() => {
    if (payType === 'full') return maxOutstandingPaise;
    const num = parseFloat(customAmountRupees);
    if (isNaN(num) || num <= 0) return 0;
    return Math.min(maxOutstandingPaise, rupeesToPaise(num));
  }, [payType, maxOutstandingPaise, customAmountRupees]);

  const remainingBalancePaise = Math.max(0, maxOutstandingPaise - amountToPayPaise);

  const handleStartPayment = async () => {
    if (!activeAssignment) {
      onToast('No fee installment selected.');
      return;
    }
    if (amountToPayPaise <= 0) {
      onToast('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Connecting to secure banking gateway...');

    await new Promise((r) => setTimeout(r, 600));
    setProcessingStep('Authorizing institutional merchant transaction...');

    await new Promise((r) => setTimeout(r, 700));
    setProcessingStep('Settling ledger credit and issuing receipt...');

    await new Promise((r) => setTimeout(r, 500));

    // Generate transaction metadata
    const randomSuffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const txnId = `TXN-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    const rcptNo = `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;
    
    let generatedRef = '';
    let modeString: PaymentRecord['mode'] = 'upi';

    if (activeMode === 'upi_qr') {
      generatedRef = `UPI/${upiIdInput || 'QR-SCAN'}/${txnId}`;
      modeString = 'upi';
    } else if (activeMode === 'card') {
      generatedRef = `CARD-${cardNumber.replace(/\s+/g, '').slice(-4)}-${txnId}`;
      modeString = 'gateway';
    } else if (activeMode === 'net_banking') {
      generatedRef = `NETB-${selectedBank.replace(/\s+/g, '').toUpperCase().slice(0, 4)}-${txnId}`;
      modeString = 'bank_transfer';
    } else if (activeMode === 'neft') {
      generatedRef = neftRef.trim() ? `NEFT/${neftRef.trim()}` : `NEFT/${txnId}`;
      modeString = 'bank_transfer';
    } else {
      generatedRef = `CASH-COUNTER-${txnId}`;
      modeString = 'cash';
    }

    const newPaymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      assignment_id: activeAssignment.id,
      student_id: activeAssignment.student_id || studentId,
      student_name: activeAssignment.student_name || studentName,
      enrolment_no: activeAssignment.enrolment_no || enrolmentNo,
      fee_title: activeAssignment.title,
      amount_paise: amountToPayPaise,
      mode: modeString,
      reference: generatedRef,
      receipt_no: rcptNo,
      recorded_by_name: 'Campus Pay Instant Gateway',
      created_at: new Date().toISOString(),
    };

    onRecordPayment(activeAssignment.id, amountToPayPaise, modeString, generatedRef);

    setIsProcessing(false);
    setCompletedPayment(newPaymentRecord);
    onToast(`Payment of ${formatPaiseToINR(amountToPayPaise)} completed successfully!`);
  };

  const handleReset = () => {
    setCompletedPayment(null);
    setIsProcessing(false);
    setProcessingStep('');
    setPayType('full');
    setCustomAmountRupees('');
    onClose();
  };

  if (!open) return null;

  return (
    <ModalDialog
      open={open}
      onClose={handleReset}
      maxWidth="2xl"
      title="Campus Pay · Institutional Payment Gateway (DEMO)"
      description="Pay fee installments securely with real-time settlement and automated official receipt generation."
    >
      {/* PROCESSING STATE */}
      {isProcessing && (
        <div className="py-16 text-center space-y-6">
          <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-ping" />
            <div className="h-16 w-16 rounded-full border-4 border-accent border-t-transparent animate-spin flex items-center justify-center">
              <Lock className="h-6 w-6 text-accent" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-ink">Simulating Payment Processing</h3>
            <p className="text-sm text-accent font-mono animate-pulse">{processingStep}</p>
          </div>
          <div className="max-w-xs mx-auto rounded-lg border border-line bg-surface p-3 text-xs text-muted flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>256-Bit SSL Mock Gateway Simulation</span>
          </div>
        </div>
      )}

      {/* COMPLETED SUCCESS STATE */}
      {!isProcessing && completedPayment && (
        <div className="space-y-6 py-2">
          <div className="rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="font-editorial text-2xl font-bold text-ink">
              Fee Payment Successful!
            </h3>
            <p className="text-sm text-muted">
              Your payment has been settled into the real-time institutional fee ledger.
            </p>
            <div className="inline-block rounded-full bg-emerald-600 text-white px-4 py-1 text-xs font-mono font-bold tracking-wider">
              {formatPaiseToINR(completedPayment.amount_paise)} CREDITED
            </div>
          </div>

          {/* Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-line bg-surface-2 p-4 text-xs">
            <div>
              <span className="text-muted block">Receipt Number</span>
              <strong className="font-mono text-accent text-sm">{completedPayment.receipt_no}</strong>
            </div>
            <div>
              <span className="text-muted block">Payment Mode</span>
              <strong className="uppercase text-ink">{completedPayment.mode}</strong>
            </div>
            <div>
              <span className="text-muted block">Reference Code</span>
              <strong className="font-mono text-ink truncate block" title={completedPayment.reference}>
                {completedPayment.reference}
              </strong>
            </div>
            <div>
              <span className="text-muted block">Remaining Due</span>
              <strong className={`font-mono text-sm ${remainingBalancePaise > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {formatPaiseToINR(remainingBalancePaise)}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              variant="secondary"
              onClick={() => {
                window.print();
                onToast('Opened print preview.');
              }}
            >
              <Printer className="h-4 w-4" />
              <span>Print Slip</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                generateFeeReceiptPDF(
                  completedPayment,
                  collegeName,
                  collegeCode,
                  remainingBalancePaise
                );
                onToast(`Downloaded official PDF for ${completedPayment.receipt_no}.`);
              }}
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Receipt</span>
            </Button>
            <Button variant="primary" onClick={handleReset}>
              <span>Done &amp; View Ledger</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* FORM INPUT STATE */}
      {!isProcessing && !completedPayment && (
        <div className="space-y-6">
          {/* Step 1: Select Fee & Amount */}
          <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  Step 1: Fee Installment &amp; Amount
                </span>
                <div className="text-sm font-semibold text-ink">
                  {studentName} · Roll: {enrolmentNo}
                </div>
              </div>
              <Badge tone="accent" dot>
                Live Balance Tracker
              </Badge>
            </div>

            {/* Installment Dropdown */}
            {unpaidAssignments.length > 0 ? (
              <Select
                label="Select Fee Installment"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                options={unpaidAssignments.map((a) => {
                  const net = a.amount_paise - (a.concession_paise || 0);
                  const bal = Math.max(0, net - (a.paid_paise || 0));
                  return {
                    value: a.id,
                    label: `${a.title} · Due: ${formatPaiseToINR(bal)} (Deadline: ${a.due_date})`,
                  };
                })}
              />
            ) : (
              <div className="p-3 text-xs text-muted rounded-lg bg-surface border border-line">
                No outstanding fees found. Showing current record for: {activeAssignment?.title || 'Fee'}
              </div>
            )}

            {/* Pay Full vs Partial Option */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPayType('full')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  payType === 'full'
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Pay In Full (100%)</span>
                  {payType === 'full' && <CheckCircle2 className="h-4 w-4 text-accent" />}
                </div>
                <div className="mt-1 font-mono text-base font-extrabold text-accent">
                  {formatPaiseToINR(maxOutstandingPaise)}
                </div>
                <span className="text-[11px] text-muted">Clears full outstanding balance</span>
              </button>

              <button
                type="button"
                onClick={() => setPayType('partial')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  payType === 'partial'
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Pay Partially (Custom)</span>
                  {payType === 'partial' && <CheckCircle2 className="h-4 w-4 text-accent" />}
                </div>
                <div className="mt-1 text-xs text-muted">
                  Max: <strong className="font-mono text-ink">{formatPaiseToINR(maxOutstandingPaise)}</strong>
                </div>
                <span className="text-[11px] text-muted">Enter any partial installment amount</span>
              </button>
            </div>

            {/* Partial Amount Input */}
            {payType === 'partial' && (
              <div className="pt-2 space-y-2">
                <Input
                  label="Enter Custom Partial Amount (in INR ₹)"
                  type="number"
                  placeholder={`e.g. 5000 (Max: ${Math.floor(maxOutstandingPaise / 100)})`}
                  value={customAmountRupees}
                  onChange={(e) => setCustomAmountRupees(e.target.value)}
                  min={1}
                  max={Math.floor(maxOutstandingPaise / 100)}
                />
                <div className="flex items-center justify-between text-xs font-mono px-1">
                  <span className="text-muted">Paying: <strong>{formatPaiseToINR(amountToPayPaise)}</strong></span>
                  <span className="text-amber-500">Remaining Balance: <strong>{formatPaiseToINR(remainingBalancePaise)}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Payment Mode Tabs */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-accent uppercase tracking-wider block">
              Step 2: Choose Payment Gateway Mode
            </span>

            <div className="flex flex-wrap gap-2 border-b border-line pb-2">
              {[
                { id: 'upi_qr', label: 'UPI / QR Code', icon: QrCode },
                { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                { id: 'net_banking', label: 'Net Banking', icon: Building2 },
                { id: 'neft', label: 'NEFT / RTGS / Bank', icon: Smartphone },
                { id: 'cash', label: 'Cash Challan', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMode(tab.id as PaymentGatewayMode)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-accent text-white shadow-sm'
                        : 'border border-line bg-surface text-ink hover:bg-surface-2'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: UPI & QR Code */}
            {activeMode === 'upi_qr' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-xl border border-line bg-surface items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-lg border border-line bg-white text-black text-center space-y-2">
                  {/* Dynamic SVG QR Code */}
                  <svg
                    viewBox="0 0 100 100"
                    className="h-32 w-32"
                    fill="currentColor"
                  >
                    <rect width="100" height="100" fill="white" />
                    {/* Corner Squares */}
                    <rect x="10" y="10" width="24" height="24" fill="black" />
                    <rect x="14" y="14" width="16" height="16" fill="white" />
                    <rect x="18" y="18" width="8" height="8" fill="black" />

                    <rect x="66" y="10" width="24" height="24" fill="black" />
                    <rect x="70" y="14" width="16" height="16" fill="white" />
                    <rect x="74" y="18" width="8" height="8" fill="black" />

                    <rect x="10" y="66" width="24" height="24" fill="black" />
                    <rect x="14" y="70" width="16" height="16" fill="white" />
                    <rect x="18" y="74" width="8" height="8" fill="black" />

                    {/* Mock Data Pattern */}
                    <rect x="40" y="15" width="6" height="6" fill="black" />
                    <rect x="50" y="15" width="8" height="6" fill="black" />
                    <rect x="42" y="25" width="12" height="6" fill="black" />
                    <rect x="15" y="42" width="6" height="12" fill="black" />
                    <rect x="25" y="42" width="8" height="6" fill="black" />
                    <rect x="42" y="42" width="16" height="16" fill="black" />
                    <rect x="46" y="46" width="8" height="8" fill="white" />
                    <rect x="66" y="42" width="18" height="6" fill="black" />
                    <rect x="72" y="52" width="12" height="8" fill="black" />
                    <rect x="42" y="66" width="6" height="18" fill="black" />
                    <rect x="52" y="72" width="8" height="12" fill="black" />
                    <rect x="66" y="66" width="8" height="8" fill="black" />
                    <rect x="80" y="80" width="10" height="10" fill="black" />
                  </svg>
                  <div className="text-[10px] font-mono text-neutral-600">
                    Scan with any UPI App · Auto-Detect Amount
                  </div>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div className="text-xs font-semibold text-ink">Pay with Instant UPI App:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'gpay', label: 'Google Pay' },
                      { id: 'phonepe', label: 'PhonePe' },
                      { id: 'paytm', label: 'Paytm' },
                      { id: 'cred', label: 'CRED UPI' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setUpiApp(app.id as any)}
                        className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                          upiApp === app.id
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-line bg-surface-2 text-muted hover:text-ink'
                        }`}
                      >
                        {app.label}
                      </button>
                    ))}
                  </div>

                  <Input
                    label="Or Enter Student / Guardian UPI ID"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Card */}
            {activeMode === 'card' && (
              <div className="space-y-3 p-4 rounded-xl border border-line bg-surface">
                {/* Visual Card Preview */}
                <div className="rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 text-white p-4 shadow-md space-y-4">
                  <div className="flex items-center justify-between text-xs tracking-widest text-slate-300">
                    <span>CAMPUS INSTITUTIONAL CARD</span>
                    <Badge tone="accent">VISA / RUPAY</Badge>
                  </div>
                  <div className="font-mono text-lg tracking-widest text-center py-1">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                    <div>
                      <span className="text-[9px] block text-slate-400">CARDHOLDER</span>
                      <span>{cardHolder.toUpperCase() || 'STUDENT'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] block text-slate-400">EXPIRES</span>
                      <span>{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Input
                    label="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 8920 1204 8821"
                  />
                  <Input
                    label="Cardholder Name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Full name as printed on card"
                  />
                  <Input
                    label="Expiry Date"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                  />
                  <Input
                    label="Security CVV"
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="•••"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Net Banking */}
            {activeMode === 'net_banking' && (
              <div className="space-y-4 p-4 rounded-xl border border-line bg-surface">
                <span className="text-xs font-semibold text-ink block">Select Popular Bank:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'Punjab National Bank'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBank(b)}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                        selectedBank === b
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-line bg-surface-2 text-muted hover:text-ink'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <Select
                  label="Or Select Other Indian Banks"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  options={[
                    { value: 'HDFC Bank', label: 'HDFC Bank' },
                    { value: 'State Bank of India', label: 'State Bank of India' },
                    { value: 'ICICI Bank', label: 'ICICI Bank' },
                    { value: 'Axis Bank', label: 'Axis Bank' },
                    { value: 'Bank of Baroda', label: 'Bank of Baroda' },
                    { value: 'Canara Bank', label: 'Canara Bank' },
                    { value: 'Union Bank of India', label: 'Union Bank of India' },
                    { value: 'IndusInd Bank', label: 'IndusInd Bank' },
                  ]}
                />
              </div>
            )}

            {/* TAB 4: NEFT / RTGS */}
            {activeMode === 'neft' && (
              <div className="space-y-3 p-4 rounded-xl border border-line bg-surface">
                <div className="p-3 rounded-lg bg-surface-2 border border-line text-xs space-y-1 font-mono">
                  <div><strong>Virtual Account:</strong> CAMPUS2026{enrolmentNo || '9842'}</div>
                  <div><strong>IFSC Code:</strong> HDFC0000128</div>
                  <div><strong>Beneficiary:</strong> {collegeName.toUpperCase()} ACADEMIC ACCOUNTS</div>
                </div>
                <Input
                  label="Bank UTR / Transaction Reference Number"
                  value={neftRef}
                  onChange={(e) => setNeftRef(e.target.value)}
                  placeholder="e.g. UTR892348210984"
                />
              </div>
            )}

            {/* TAB 5: Cash Counter */}
            {activeMode === 'cash' && (
              <div className="p-4 rounded-xl border border-line bg-surface space-y-2">
                <div className="flex items-center gap-2 text-xs text-amber-500 font-semibold">
                  <AlertCircle className="h-4 w-4" />
                  <span>Physical Cash Counter Settlement</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Generates an immediate official cash voucher receipt to be recorded and sealed by the Finance &amp; Accounts Desk.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
            <div>
              <span className="text-xs text-muted block">Total Payable Now</span>
              <strong className="font-mono text-xl font-bold text-accent">
                {formatPaiseToINR(amountToPayPaise)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartPayment}
                disabled={amountToPayPaise <= 0}
              >
                <Lock className="h-4 w-4" />
                <span>Pay {formatPaiseToINR(amountToPayPaise)} Securely</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModalDialog>
  );
};
