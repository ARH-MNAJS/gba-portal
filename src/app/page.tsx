'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Rocket, GamepadIcon, XIcon, Brain, Lightbulb, Puzzle, Dices, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { TextEffect } from '@/components/motion-primitives/text-effect'
import { AnimatedGroup } from '@/components/motion-primitives/animated-group'
import { HeroHeader } from '@/components/hero5-header'
import { InfiniteSlider } from '@/components/motion-primitives/infinite-slider'
import { ProgressiveBlur } from '@/components/motion-primitives/progressive-blur'
import Features from '@/components/features-12'
import IntegrationsSection from '@/components/integrations-1'
import ContentSection from '@/components/content-1'
import Pricing from '@/components/pricing'
import FAQsThree from '@/components/faqs-3'
import { Footer } from '@/components/footer'
import { Slot } from '@radix-ui/react-slot'
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogContainer,
  MorphingDialogTitle,
  MorphingDialogDescription,
  MorphingDialogClose
} from '@/components/motion-primitives/morphing-dialog'
import TrialGame from '@/games/TrialGame'

// Loading animation component
const GameLoader = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const loadingSteps = [
    "Loading Game Engine",
    "Running Question Algorithm",
    "Formatting Game",
    "Adding Visuals",
    "Happy Learning :)",
    "Starting Game..."
  ];

  // Different timing for each step
  const stepTimes = [800, 1800, 800, 800, 1500, 200]; // Adjusted timing for visibility

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < loadingSteps.length - 1) {
        setStep(step + 1);
      } else {
        // When all steps are complete
        setTimeout(() => {
          onComplete();
        }, 100);
      }
    }, stepTimes[step]); // Use different timing for each step

    return () => clearTimeout(timer);
  }, [step, loadingSteps.length, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative mb-6">
        <div className="w-12 h-12 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        <div className="w-8 h-8 absolute top-2 left-2 rounded-full border-4 border-t-transparent border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
      </div>
      <div className="text-xl font-semibold mb-2">{loadingSteps[step]}</div>
      <div className="flex space-x-2 mt-4">
        {loadingSteps.map((_, i) => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full ${i === step ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
          />
        ))}
      </div>
    </div>
  );
};

// Background icons component - moved away from game area
const BackgroundIcons = () => {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
      <div className="absolute top-5 left-5 text-foreground dark:text-foreground w-16 h-16">
        <Brain className="w-full h-full" />
      </div>
      <div className="absolute bottom-10 left-10 text-foreground dark:text-foreground w-12 h-12">
        <Dices className="w-full h-full" />
      </div>
      <div className="absolute top-20 right-5 text-foreground dark:text-foreground w-14 h-14">
        <Puzzle className="w-full h-full" />
      </div>
      <div className="absolute bottom-5 right-10 text-foreground dark:text-foreground w-10 h-10">
        <Lightbulb className="w-full h-full" />
      </div>
      <div className="absolute bottom-32 left-1/4 text-foreground dark:text-foreground w-14 h-14">
        <Sparkles className="w-full h-full" />
      </div>
    </div>
  );
};

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring',
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <div
                    aria-hidden
                    className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block">
                    <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
                    <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
                </div>
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            delayChildren: 1,
                                        },
                                    },
                                },
                                item: {
                                    hidden: {
                                        opacity: 0,
                                        y: 20,
                                    },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                            type: 'spring',
                                            bounce: 0.3,
                                            duration: 2,
                                        },
                                    },
                                },
                            }}
                            className="absolute inset-0 -z-20">
                            <Image
                                src="/night.webp"
                                alt="background"
                                className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 dark:block"
                                width="3276"
                                height="4095"
                            />
                        </AnimatedGroup>
                        <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"></div>
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                                <AnimatedGroup variants={transitionVariants}>
                                    <Link
                                        href="#link"
                                        className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950">
                                        <span className="flex items-center gap-2">
                                            <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                                            <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                                <span className="flex size-6">
                                                    <Rocket className="m-auto size-3" />
                                                </span>
                                                <span className="flex size-6">
                                                    <Rocket className="m-auto size-3" />
                                                </span>
                                            </div>
                                        </div>
                                            <span className="text-foreground mr-3 text-sm">New games added every week</span>
                                        </span>
                                        
                                        
                                    </Link>
                                </AnimatedGroup>

                                <TextEffect
                                    preset="fade-in-blur"
                                    speedSegment={0.3}
                                    as="h1"
                                    className="mt-8 text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem]">
                                    Gamified Skills Assessment Platform
                                </TextEffect>
                                <TextEffect
                                    per="line"
                                    preset="fade-in-blur"
                                    speedSegment={0.3}
                                    delay={0.5}
                                    as="p"
                                    className="mx-auto mt-8 max-w-2xl text-balance text-lg">
                                    Evaluate talent with precision through interactive, game-based assessments designed to measure real skills in a dynamic and immersive environment.
                                </TextEffect>

                                <AnimatedGroup
                                    variants={{
                                        container: {
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05,
                                                    delayChildren: 0.75,
                                                },
                                            },
                                        },
                                        ...transitionVariants,
                                    }}
                                    className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                                    <div
                                        key={1}
                                        className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5">
                                        <Button
                                            asChild
                                            size="lg"
                                            className="rounded-xl px-5 text-base">
                                            <Link href="/login">
                                                <span className="text-nowrap">Get Started</span>
                                            </Link>
                                        </Button>
                                    </div>
                                    <MorphingDialog>
                                        <MorphingDialogTrigger asChild>
                                            <Button
                                                key={2}
                                                size="lg"
                                                variant="ghost"
                                                className="h-10.5 rounded-xl px-5">
                                                <span className="flex items-center">
                                                    <ArrowRight className="mr-2 size-4 rotate-[-45deg]" />
                                                    <span className="text-nowrap">Try a Game</span>
                                                </span>
                                            </Button>
                                        </MorphingDialogTrigger>
                                        <MorphingDialogContainer>
                                            <MorphingDialogContent 
                                                className="w-full max-w-[700px] h-[700px] bg-white dark:bg-[#121212] overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 relative flex items-center justify-center"
                                                style={{
                                                    maxHeight: '85vh',
                                                    width: '100%',
                                                    position: 'relative'
                                                }}
                                            >
                                                <BackgroundIcons />
                                                
                                                <MorphingDialogClose asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="absolute top-3 right-3 z-100 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                                                    >
                                                        <XIcon size={24} className="text-gray-700 dark:text-gray-300" />
                                                    </Button>
                                                </MorphingDialogClose>
                                                
                                                <TrialGame />
                                            </MorphingDialogContent>
                                        </MorphingDialogContainer>
                                    </MorphingDialog>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                ...transitionVariants,
                            }}>
                            <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                                <div
                                    aria-hidden
                                    className="bg-linear-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                                />
                                <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1">
                                    <Image
                                        className="bg-background aspect-15/8 relative hidden rounded-2xl dark:block"
                                        src="/dark_dash.png"
                                        alt="app screen"
                                        width="2700"
                                        height="1440"
                                    />
                                    <Image
                                        className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden"
                                        src="/light_dash.png"
                                        alt="app screen"
                                        width="2700"
                                        height="1440"
                                    />
                                </div>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>
                <section className="bg-background pb-2 mb-0">
                    <div className="group relative m-auto max-w-7xl px-6">
                        <div className="flex flex-col items-center md:flex-row">
                            <div className="md:max-w-44 md:border-r md:pr-6">
                                <p className="text-end text-sm">Covering Assessment from All Top MNC's</p>
                            </div>
                            <div className="relative py-6 md:w-[calc(100%-11rem)]">
                                <InfiniteSlider
                                    speedOnHover={20}
                                    speed={40}
                                    gap={112}>
                                    <div className="flex">
                                        <img
                                            className="mx-auto h-5 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/nvidia.svg"
                                            alt="Nvidia Logo"
                                            height="20"
                                            width="auto"
                                        />
                                    </div>

                                    <div className="flex">
                                        <img
                                            className="mx-auto h-4 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/column.svg"
                                            alt="Column Logo"
                                            height="16"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex">
                                        <img
                                            className="mx-auto h-4 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/github.svg"
                                            alt="GitHub Logo"
                                            height="16"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex">
                                        <img
                                            className="mx-auto h-5 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/nike.svg"
                                            alt="Nike Logo"
                                            height="20"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex">
                                        <img
                                            className="mx-auto h-5 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg"
                                            alt="Lemon Squeezy Logo"
                                            height="20"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex">
                                        <img
                                            className="mx-auto h-4 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/laravel.svg"
                                            alt="Laravel Logo"
                                            height="16"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex">
                                        <img
                                            className="mx-auto h-7 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/lilly.svg"
                                            alt="Lilly Logo"
                                            height="28"
                                            width="auto"
                                        />
                                    </div>

                                    <div className="flex">
                                        <img
                                            className="mx-auto h-6 w-fit dark:invert"
                                            src="https://html.tailus.io/blocks/customers/openai.svg"
                                            alt="OpenAI Logo"
                                            height="24"
                                            width="auto"
                                        />
                                    </div>
                                </InfiniteSlider>

                                <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                                <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>
                                <ProgressiveBlur
                                    className="pointer-events-none absolute left-0 top-0 h-full w-20"
                                    direction="left"
                                    blurIntensity={1}
                                />
                                <ProgressiveBlur
                                    className="pointer-events-none absolute right-0 top-0 h-full w-20"
                                    direction="right"
                                    blurIntensity={1}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent to-transparent"></div>
                </section>
                {/* <Features />
                <IntegrationsSection />
                <ContentSection />
                <Pricing />
                <FAQsThree />
                <Footer /> */}
            </main>
        </>
    )
}
