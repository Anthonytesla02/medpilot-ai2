import boy from '@/assets/patient-boy.jpg';
import girl from '@/assets/patient-girl.jpg';
import mother from '@/assets/patient-mother-infant.jpg';
import youngMan from '@/assets/patients/young-man.png.asset.json';
import youngWoman from '@/assets/patients/young-woman.png.asset.json';
import olderMan from '@/assets/patients/older-man.png.asset.json';
import olderWoman from '@/assets/patients/older-woman.png.asset.json';
import teenGirl from '@/assets/patients/teen-girl.png.asset.json';
import teenBoy from '@/assets/patients/teen-boy.png.asset.json';

const MALE = new Set(['man', 'boy', 'older-man']);

export function portraitFor(avatar: string, age?: number): string {
  if (avatar === 'mother-infant') return mother;
  const male = MALE.has(avatar);
  const a = age ?? (avatar === 'boy' || avatar === 'girl' ? 8 : avatar.startsWith('older') ? 55 : 30);
  if (a < 12) return male ? boy : girl;
  if (a < 20) return male ? teenBoy.url : teenGirl.url;
  if (a < 40) return male ? youngMan.url : youngWoman.url;
  return male ? olderMan.url : olderWoman.url;
}

export function PatientPortrait({ avatar, name, age, className = '' }: { avatar: string; name: string; age?: number; className?: string }) {
  return <img src={portraitFor(avatar, age)} alt={`Patient portrait: ${name}`} className={`object-cover object-top ${className}`} />;
}
