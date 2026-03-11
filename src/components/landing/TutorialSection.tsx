import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, MessageSquare, BookOpen, FlaskConical, Pill, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const tutorials = [
  {
    id: 'signup',
    videoSrc: '/videos/0_21_signup-and-onboarding.mp4',
    title: 'Sign Up & Onboarding',
    description: 'Create your account, choose your role, and get started in under a minute.',
    icon: UserPlus,
    badge: 'Start Here',
  },
  {
    id: 'chat',
    videoSrc: '/videos/0_19_chatbot_conversations.mp4',
    title: 'AI Medical Chat',
    description: 'Ask clinical questions and get instant answers from STG & BNF guidelines.',
    icon: MessageSquare,
    badge: 'Core Feature',
  },
  {
    id: 'modules',
    videoSrc: '/videos/0_13_tutorial_modules.mp4',
    title: 'Learning Modules',
    description: 'Browse courses, read topics, and take quizzes to test your knowledge.',
    icon: BookOpen,
    badge: 'Learn',
  },
  {
    id: 'case-study',
    videoSrc: '/videos/0_16_clinical_case_study.mp4',
    title: 'Clinical Case Studies',
    description: 'Analyze patient scenarios, diagnose conditions, and get AI-graded feedback.',
    icon: FlaskConical,
    badge: 'Practice',
  },
  {
    id: 'drugs',
    videoSrc: '/videos/0_8_drugs-practice.mp4',
    title: 'Drug Practice & Profile',
    description: 'Match brand names to active ingredients and track your performance stats.',
    icon: Pill,
    badge: 'Practice',
  },
];

export default function TutorialSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = tutorials[activeIndex];

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="mb-4">
            <Play className="w-3 h-3 mr-1" /> Video Tutorials
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See <span className="gradient-text">MediGuide AI</span> in Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Watch quick walkthroughs of every feature before you sign up.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 rounded-2xl overflow-hidden border border-border/50 bg-card shadow-soft"
          >
            <div className="relative w-full aspect-[9/16] sm:aspect-video bg-foreground/5 flex items-center justify-center">
              <video
                key={active.videoSrc}
                className="w-full h-full object-contain bg-black"
                controls
                autoPlay
                muted
                playsInline
              >
                <source src={active.videoSrc} type="video/mp4" />
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Play className="w-12 h-12" />
                  <p className="text-sm">Video not available yet</p>
                </div>
              </video>
            </div>
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <active.icon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">{active.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{active.description}</p>
            </div>
          </motion.div>

          {/* Tutorial List */}
          <div className="flex flex-col gap-2">
            {tutorials.map((tutorial, i) => (
              <motion.button
                key={tutorial.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveIndex(i)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  i === activeIndex
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/50 bg-card hover:border-primary/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    i === activeIndex ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <tutorial.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{tutorial.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {tutorial.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{tutorial.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
