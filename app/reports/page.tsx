import ModulePlaceholder from '@/components/ModulePlaceholder';

export default function ReportsPage() {
  return <ModulePlaceholder eyebrow="Clinical reporting" title="Reports" description="Generate understandable, print-friendly patient and screening summaries only from authorized, stored clinical records." requirements={['Authorized patient data-transfer objects', 'Clinician-reviewed result separation', 'Print/PDF accessibility validation', 'Export audit events and retention controls']} />;
}
