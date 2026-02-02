import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Award,
  Crown,
  Target,
  BookOpen,
  BarChart3,
  ChevronRight,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  tests_completed: number;
  avg_test_score: number;
  modules_passed: number;
  avg_quiz_score: number;
  combined_score: number;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'combined' | 'tests' | 'modules'>('combined');
  const { user } = useAuth();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('leaderboard_stats')
      .select('*');

    if (!error && data) {
      setLeaderboard(data as LeaderboardEntry[]);
    }
    setLoading(false);
  };

  const getSortedLeaderboard = () => {
    const sorted = [...leaderboard];
    switch (sortBy) {
      case 'tests':
        return sorted.sort((a, b) => b.avg_test_score - a.avg_test_score);
      case 'modules':
        return sorted.sort((a, b) => b.modules_passed - a.modules_passed);
      case 'combined':
      default:
        return sorted.sort((a, b) => b.combined_score - a.combined_score);
    }
  };

  const sortedLeaderboard = getSortedLeaderboard();
  const userRank = sortedLeaderboard.findIndex(e => e.user_id === user?.id) + 1;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  const getRankBgClass = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-primary/10 border-primary/30';
    switch (rank) {
      case 1:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 2:
        return 'bg-slate-500/10 border-slate-500/30';
      case 3:
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-card border-border/50';
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Global Leaderboard
            </CardTitle>
            {userRank > 0 && (
              <Badge variant="outline" className="text-xs">
                Your Rank: #{userRank}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)} className="mb-4">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="combined" className="text-xs">
                <BarChart3 className="w-3 h-3 mr-1" />
                Overall
              </TabsTrigger>
              <TabsTrigger value="tests" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="modules" className="text-xs">
                <BookOpen className="w-3 h-3 mr-1" />
                Modules
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {sortedLeaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No rankings yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete tests to appear on the leaderboard
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {sortedLeaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.user_id === user?.id;
                  
                  return (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${getRankBgClass(rank, isCurrentUser)}`}
                    >
                      <div className="flex items-center justify-center w-6">
                        {getRankIcon(rank)}
                      </div>
                      
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {entry.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {entry.display_name || 'Anonymous User'}
                          {isCurrentUser && (
                            <span className="text-xs text-primary ml-1">(You)</span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {entry.tests_completed} tests
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {entry.modules_passed} modules
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {sortBy === 'combined' && `${entry.combined_score}`}
                          {sortBy === 'tests' && `${entry.avg_test_score}%`}
                          {sortBy === 'modules' && entry.modules_passed}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sortBy === 'combined' && 'pts'}
                          {sortBy === 'tests' && 'avg'}
                          {sortBy === 'modules' && 'passed'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
