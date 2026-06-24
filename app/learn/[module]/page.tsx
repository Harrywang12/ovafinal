"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, notFound } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthGuard } from "../../../components/auth-guard";
import { 
  ModuleHero, 
  LessonTabs, 
  LessonContent, 
  ModuleQuiz 
} from "../../../components/learn";
import { getModuleBySlug, getNextModule } from "../../../lib/module-content";
import { fadeInUp } from "../../../lib/animations";
import { useSupabaseAuth } from "../../../lib/useSupabaseAuth";
import type { LearningProgressResponse } from "../../../lib/learning";

export default function ModulePage() {
  const { session } = useSupabaseAuth();
  const params = useParams();
  const moduleSlug = params.module as string;
  const [activeLesson, setActiveLesson] = useState(0);
  
  const currentModule = getModuleBySlug(moduleSlug);
  const nextModule = currentModule ? getNextModule(currentModule.id) : undefined;
  
  // Reset to first lesson when module changes
  useEffect(() => {
    setActiveLesson(0);
  }, [moduleSlug]);
  
  if (!currentModule) {
    notFound();
  }

  const currentLesson = currentModule.lessons[activeLesson];
  const hasNextLesson = activeLesson < currentModule.lessons.length - 1;

  const progressQuery = useQuery<LearningProgressResponse>({
    queryKey: ["learn-progress"],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const res = await fetch("/api/learn/progress", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load learning progress");
      return res.json();
    },
  });

  const markLessonViewed = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch("/api/learn/progress/lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ module_id: currentModule.id, lesson_id: lessonId }),
      });
      if (!res.ok) throw new Error("Failed to save lesson progress");
      return res.json();
    },
    onSuccess: () => {
      progressQuery.refetch();
    },
  });

  useEffect(() => {
    if (!session?.access_token || !currentLesson?.id) return;
    markLessonViewed.mutate(currentLesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, currentModule.id, currentLesson?.id]);

  const moduleProgress = progressQuery.data?.modules.find((m) => m.module_id === currentModule.id) ?? null;

  const handleNextLesson = () => {
    if (hasNextLesson) {
      setActiveLesson(prev => prev + 1);
      // Scroll to top of content
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--surface)]">
        {/* Hero Section */}
        <ModuleHero module={currentModule} lessonCount={currentModule.lessons.length} />
        
        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Lesson Tabs */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mb-10"
          >
            <LessonTabs
              lessons={currentModule.lessons}
              activeTab={activeLesson}
              onTabChange={setActiveLesson}
              moduleColor={currentModule.color}
            />
          </motion.div>
          
          {/* Lesson Content */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="mb-16"
          >
            <LessonContent
              lesson={currentLesson}
              moduleColor={currentModule.color}
              onNext={handleNextLesson}
              hasNext={hasNextLesson}
            />
          </motion.div>
          
          {/* Quiz Section - Only show after viewing all lessons or on last lesson */}
          {activeLesson === currentModule.lessons.length - 1 && (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mt-16 pt-8 border-t border-border"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-display font-bold text-primary mb-2">
                  Ready to Test Your Knowledge?
                </h2>
                <p className="text-muted">
                  You&apos;ve completed all lessons in this module. Take a quiz to reinforce what you&apos;ve learned.
                </p>
              </motion.div>
              
              <ModuleQuiz module={currentModule} nextModule={nextModule} progress={moduleProgress} />
            </motion.div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
