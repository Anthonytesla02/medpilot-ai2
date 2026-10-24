import woman from '@/assets/patient-woman.jpg';
import man from '@/assets/patient-man.jpg';
import olderWoman from '@/assets/patient-older-woman.jpg';
import boy from '@/assets/patient-boy.jpg';
import girl from '@/assets/patient-girl.jpg';
import mother from '@/assets/patient-mother-infant.jpg';
const portraits: Record<string, string> = { woman, man, 'older-woman': olderWoman, boy, girl, 'mother-infant': mother };
export function PatientPortrait({ avatar, name, className = '' }: { avatar: string; name: string; className?: string }) {
  return <img src={portraits[avatar] ?? woman} alt={`Synthetic patient portrait: ${name}`} className={`object-cover object-top ${className}`} />;
}