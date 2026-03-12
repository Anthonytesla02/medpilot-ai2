import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, UserPlus, MessageSquare, BookOpen, FlaskConical, Pill } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TutorialStep {
  title: string;
  content: string;
  image?: string;
}

interface TutorialGuide {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  description: string;
  steps: TutorialStep[];
}

const guides: TutorialGuide[] = [
  {
    id: 'signup',
    title: 'Sign Up & Onboarding',
    icon: UserPlus,
    badge: 'Start Here',
    description: 'Create your account, verify your email, and get started.',
    steps: [
      {
        title: 'Step 1: Navigate to the Website',
        content: 'Open your browser and go to the MediGuide AI website. You\'ll see the landing page with key features and a "Get Started" button.',
        image: '/images/tutorial/page_1.jpg',
      },
      {
        title: 'Step 2: Click "Get Started"',
        content: 'On the landing page, click the "Get Started" button to access the authentication page.',
        image: '/images/tutorial/page_2.jpg',
      },
      {
        title: 'Step 3: Fill in Registration Details',
        content: 'Complete the registration form with your Full Name, Role (Teacher, Worker/Intern, or Student), School/Institution, Email, and Password.',
        image: '/images/tutorial/page_3.jpg',
      },
      {
        title: 'Step 4: Select Your Role & School',
        content: 'Click the role dropdown and select your role. Then choose your school/institution from the dropdown. If your institution is not listed, select "Other".',
        image: '/images/tutorial/page_4.jpg',
      },
      {
        title: 'Step 5: Verify Your Email',
        content: 'After clicking "Create Account", you\'ll see a message: "Check Your Email". Open your email inbox (check spam folder too) and click the verification link to activate your account.',
        image: '/images/tutorial/page_5.jpg',
      },
    ],
  },
  {
    id: 'chat',
    title: 'AI Medical Chat',
    icon: MessageSquare,
    badge: 'Core Feature',
    description: 'Ask clinical questions and get instant AI-powered answers from STG & BNF guidelines.',
    steps: [
      {
        title: 'Accessing Chat',
        content: 'Click on the Chat icon in the bottom navigation bar. The chat interface will open with an input field at the bottom where you can type your medical questions.',
        image: '/images/tutorial/page_8.jpg',
      },
      {
        title: 'Using the AI Assistant',
        content: 'Type your question in the input field (e.g., "What is the treatment for malaria?"), then click Send or press Enter. The AI provides detailed answers based on the Ghana STG 7th Edition.',
        image: '/images/tutorial/page_9.jpg',
      },
      {
        title: 'Key Features',
        content: '• Medical Question Answering — Ask any question related to Ghana Standard Treatment Guidelines.\n• Chat History — Previous conversations are saved for reference.\n• Credit System — Each question uses credits from your account.',
      },
    ],
  },
  {
    id: 'modules',
    title: 'Learning Modules',
    icon: BookOpen,
    badge: 'Learn',
    description: 'Browse courses, read topics, and take quizzes to test your knowledge.',
    steps: [
      {
        title: 'Accessing Tests & Modules',
        content: 'Click on the Tests icon in the bottom navigation bar to access practice MCQ tests and learning modules. Browse available courses and select topics to study.',
        image: '/images/tutorial/page_9.jpg',
      },
      {
        title: 'Taking Quizzes',
        content: 'After studying a module, take the quiz to test your knowledge. Your scores are tracked on your profile so you can monitor your progress over time.',
        image: '/images/tutorial/page_10.jpg',
      },
    ],
  },
  {
    id: 'case-study',
    title: 'Clinical Case Studies',
    icon: FlaskConical,
    badge: 'Practice',
    description: 'Analyze patient scenarios, diagnose conditions, and get AI-graded feedback.',
    steps: [
      {
        title: 'Accessing Cases',
        content: 'Click on the Cases icon in the bottom navigation bar. You can view existing case studies or generate new ones using the AI.',
        image: '/images/tutorial/page_9.jpg',
      },
      {
        title: 'Working Through a Case',
        content: 'Each case presents a patient scenario. Analyze the symptoms, make your diagnosis, and propose a treatment plan. The AI will grade your response and provide detailed feedback based on official guidelines.',
      },
    ],
  },
  {
    id: 'drugs',
    title: 'Drug Practice & Profile',
    icon: Pill,
    badge: 'Practice',
    description: 'Match brand names to active ingredients and manage your credits.',
    steps: [
      {
        title: 'Profile & Stats',
        content: 'Click on the Profile icon to view your account stats: Credits remaining, Messages sent, Cases generated, and Practice test scores.',
        image: '/images/tutorial/page_10.jpg',
      },
      {
        title: 'Buying Credits',
        content: 'Click "Buy More Credits" on your profile page. Choose from Starter (5 credits — GH₵1), Standard (50 credits — GH₵10), or Premium (300 credits — GH₵50). Pay via Mobile Money, Card, or Bank Transfer.',
        image: '/images/tutorial/page_11.jpg',
      },
      {
        title: 'Drug Practice',
        content: 'Access the Drug Practice section from the Tests page. Match brand names to their active ingredients across different drug categories to build your pharmaceutical knowledge.',
      },
    ],
  },
];

export default function WrittenTutorial() {
  const [expandedId, setExpandedId] = useState<string | null>('signup');

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      {guides.map((guide, gi) => (
        <motion.div
          key={guide.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: gi * 0.05 }}
          className="rounded-xl border border-border/50 bg-card overflow-hidden"
        >
          {/* Accordion Header */}
          <button
            onClick={() => toggle(guide.id)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                expandedId === guide.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <guide.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm">{guide.title}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {guide.badge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{guide.description}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                expandedId === guide.id ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Accordion Content */}
          <AnimatePresence initial={false}>
            {expandedId === guide.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                  {guide.steps.map((step, si) => (
                    <div key={si} className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">
                          {si + 1}
                        </span>
                        {step.title}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed pl-8 whitespace-pre-line">
                        {step.content}
                      </p>
                      {step.image && (
                        <div className="pl-8 pt-1">
                          <img
                            src={step.image}
                            alt={step.title}
                            className="rounded-lg border border-border/50 shadow-sm w-full max-w-lg"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
