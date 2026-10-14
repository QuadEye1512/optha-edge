import ModulePlaceholder from '@/components/ModulePlaceholder';

export default function ExaminationsPage() {
  return <ModulePlaceholder eyebrow="Screening records" title="Examinations" description="Immutable, laterality-aware records will preserve original images, quality assessments, model versions, predictions, reviews, and audit history." requirements={['Patient and consent records', 'Encrypted retinal-image object storage', 'Validated image-quality workflow', 'Immutable model and preprocessing registry snapshots']} />;
}
