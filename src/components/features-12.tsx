'use client'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { LineChart, BarChart4, Gamepad2, Trophy, Shield } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BorderBeam } from '@/components/magicui/border-beam'

export default function Features() {
    type ImageKey = 'item-1' | 'item-2' | 'item-3' | 'item-4'
    const [activeItem, setActiveItem] = useState<ImageKey>('item-1')

    const images = {
        'item-1': {
            image: '/charts.png',
            alt: 'Assessment analytics dashboard',
        },
        'item-2': {
            image: '/music.png',
            alt: 'Game-based assessments',
        },
        'item-3': {
            image: '/mail2.png',
            alt: 'Multi-role platform',
        },
        'item-4': {
            image: '/payments.png',
            alt: 'Performance insights',
        },
    }

    return (
        <section className="relative -mt-32 pt-0 pb-32">
            {/* Overlay gradient with no solid background */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-gray-100 dark:to-black/95"></div>
            
            {/* Content area with padding to position content properly */}
            <div className="relative mx-auto max-w-5xl px-6 pt-48">
                {/* Title area */}
                <div className="relative z-10 mx-auto max-w-2xl space-y-6 text-center pt-8">
                    <h2 className="text-balance text-4xl font-semibold text-gray-900 dark:text-white lg:text-6xl">Features We Offer</h2>
                    <p className="text-gray-700 dark:text-zinc-300">Our platform provides comprehensive game-based assessment tools for colleges, students, and administrators to effectively evaluate and track skills development.</p>
                </div>

                {/* Main content area */}
                <div className="mt-16 md:mt-24 grid gap-12 md:grid-cols-2 lg:gap-20">
                    <Accordion
                        type="single"
                        value={activeItem}
                        onValueChange={(value) => setActiveItem(value as ImageKey)}
                        className="w-full">
                        <AccordionItem value="item-1" className="border-gray-200 dark:border-zinc-800/50">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-base">
                                    <BarChart4 className="size-4" />
                                    Advanced Analytics Dashboard
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-700 dark:text-zinc-300">
                                Comprehensive analytics with detailed performance metrics for each assessment. Track student participation, score distributions, and individual game performance through interactive charts and visualizations. Export reports in CSV format for further analysis.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-gray-200 dark:border-zinc-800/50">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-base">
                                    <Gamepad2 className="size-4" />
                                    Diverse Game-Based Assessments
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-700 dark:text-zinc-300">
                                Multiple assessment games across various categories including Memory Match, Word Scramble, Math Quiz, Switch, and Geo-Sudo. Each game is designed to test different skills like memory, language, mathematics, pattern recognition, and logical reasoning.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3" className="border-gray-200 dark:border-zinc-800/50">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-base">
                                    <Shield className="size-4" />
                                    Flexible Assessment Configuration
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-700 dark:text-zinc-300">
                                Customize assessment parameters including duration, maximum attempts, and game switching options. Set specific time periods for assessments with defined start and end dates. Control whether students can see reports immediately after completing their assessments.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-gray-200 dark:border-zinc-800/50">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2 text-base">
                                    <Trophy className="size-4" />
                                    Multi-Level Performance Insights
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-700 dark:text-zinc-300">
                                Detailed performance breakdowns for individual students with normalized scoring across different games. Track progress over time with historical data comparisons. Receive automated performance insights based on score thresholds to quickly identify strengths and improvement areas.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <div className="relative bg-transparent flex overflow-hidden rounded-3xl border border-gray-200 dark:border-zinc-800/30 p-2">
                        <div className="absolute inset-0 bg-white/60 dark:bg-black/20 backdrop-blur-sm rounded-3xl"></div>
                        <div className="w-15 absolute inset-0 right-0 ml-auto border-l border-gray-200 dark:border-zinc-800/30 bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_1px,transparent_1px,transparent_8px)] dark:bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03)_1px,transparent_1px,transparent_8px)]"></div>
                        <div className="aspect-76/59 bg-white/40 dark:bg-black/20 relative w-[calc(3/4*100%+3rem)] rounded-2xl z-10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${activeItem}-id`}
                                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                    className="size-full overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800/30 bg-white/80 dark:bg-black/40 shadow-md">
                                    <Image
                                        src={images[activeItem].image}
                                        className="size-full object-cover object-left-top dark:mix-blend-lighten"
                                        alt={images[activeItem].alt}
                                        width={1207}
                                        height={929}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        <BorderBeam
                            duration={6}
                            size={200}
                            className="from-transparent via-purple-600/10 dark:via-purple-700/20 to-transparent"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
