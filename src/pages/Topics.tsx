import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Stethoscope, 
  Brain, 
  Pill, 
  Baby, 
  Activity,
  Bone,
  Eye,
  Ear,
  Droplet,
  Thermometer,
  Shield
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { PageLoader } from '@/components/PageLoader';

const topics = [
  { 
    icon: Heart, 
    title: 'Cardiovascular', 
    description: 'Heart conditions, hypertension, stroke',
    color: 'bg-red-500/10 text-red-500',
    query: 'cardiovascular disorders treatment'
  },
  { 
    icon: Activity, 
    title: 'Respiratory', 
    description: 'Asthma, pneumonia, bronchitis',
    color: 'bg-blue-500/10 text-blue-500',
    query: 'respiratory disorders treatment'
  },
  { 
    icon: Stethoscope, 
    title: 'Gastrointestinal', 
    description: 'Diarrhoea, ulcers, liver diseases',
    color: 'bg-green-500/10 text-green-500',
    query: 'gastrointestinal disorders treatment'
  },
  { 
    icon: Brain, 
    title: 'Neurological', 
    description: 'Epilepsy, headaches, seizures',
    color: 'bg-purple-500/10 text-purple-500',
    query: 'neurological disorders treatment'
  },
  { 
    icon: Pill, 
    title: 'Infectious Diseases', 
    description: 'Malaria, typhoid, HIV/AIDS',
    color: 'bg-orange-500/10 text-orange-500',
    query: 'infectious diseases treatment'
  },
  { 
    icon: Thermometer, 
    title: 'Endocrine', 
    description: 'Diabetes, thyroid disorders',
    color: 'bg-pink-500/10 text-pink-500',
    query: 'endocrine disorders treatment'
  },
  { 
    icon: Droplet, 
    title: 'Haematological', 
    description: 'Anaemia, sickle cell disease',
    color: 'bg-red-600/10 text-red-600',
    query: 'blood disorders treatment'
  },
  { 
    icon: Baby, 
    title: 'Paediatrics', 
    description: 'Newborn care, childhood illnesses',
    color: 'bg-cyan-500/10 text-cyan-500',
    query: 'paediatric conditions treatment'
  },
  { 
    icon: Shield, 
    title: 'Immunisation', 
    description: 'Vaccines, preventive care',
    color: 'bg-emerald-500/10 text-emerald-500',
    query: 'immunisation schedule and vaccines'
  },
  { 
    icon: Bone, 
    title: 'Musculoskeletal', 
    description: 'Arthritis, fractures, pain',
    color: 'bg-amber-500/10 text-amber-500',
    query: 'musculoskeletal disorders treatment'
  },
  { 
    icon: Eye, 
    title: 'Ophthalmology', 
    description: 'Eye infections, vision problems',
    color: 'bg-indigo-500/10 text-indigo-500',
    query: 'eye disorders treatment'
  },
  { 
    icon: Ear, 
    title: 'ENT', 
    description: 'Ear, nose, throat conditions',
    color: 'bg-teal-500/10 text-teal-500',
    query: 'ENT disorders treatment'
  },
];

export default function Topics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleTopicClick = (query: string) => {
    // Navigate to chat with a pre-filled question
    navigate('/chat', { state: { initialMessage: `Tell me about ${query} according to Ghana STG guidelines.` } });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Medical Topics</h1>
          <p className="text-sm text-muted-foreground">Explore treatment guidelines by category</p>
        </div>
      </header>

      {/* Topics Grid */}
      <div className="flex-1 px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {topics.map((topic, i) => (
            <motion.button
              key={topic.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTopicClick(topic.query)}
              className="flex flex-col items-start p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-lg ${topic.color} flex items-center justify-center mb-3`}>
                <topic.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{topic.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{topic.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
