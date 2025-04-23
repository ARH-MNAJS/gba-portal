'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import Link from 'next/link'

type FAQItem = {
    id: string
    icon: IconName
    question: string
    answer: string
}

export default function FAQsThree() {
    const faqItems: FAQItem[] = [
        {
            id: 'item-1',
            icon: 'gamepad-2',
            question: 'What types of games are available in the assessment platform?',
            answer: 'XcelIQ offers a diverse range of assessment games across multiple categories, including Memory Match, Word Scramble, Math Quiz, Switch, and Geo-Sudo. Each game is designed to measure specific cognitive skills such as memory recall, language proficiency, mathematical reasoning, pattern recognition, and logical problem-solving abilities.',
        },
        {
            id: 'item-2',
            icon: 'brain',
            question: 'How does the adaptive algorithm customize assessments?',
            answer: 'Our proprietary algorithm tailors assessments based on company requirements and selected difficulty levels. The system dynamically adjusts question complexity, scoring parameters, and time constraints to match the specific skills needed for different roles. As candidates progress through games, the algorithm can also adapt in real-time to their performance, presenting more challenging questions as they demonstrate proficiency.',
        },
        {
            id: 'item-3',
            icon: 'credit-card',
            question: 'What\'s included in the Free and Premium pricing plans?',
            answer: 'The Free plan (₹0/month) includes 3 free game attempts per month, 3 company-specific assessments, and basic practice analytics. The Premium plan (₹199/month) offers unlimited game attempts and assessments, video course content, company assessment wiki, nationwide leaderboards, custom assessment creation tools, and a detailed analytics dashboard. Both plans are priced per user.',
        },
        {
            id: 'item-4',
            icon: 'bar-chart-4',
            question: 'What analytics and reporting features are available?',
            answer: 'The platform provides comprehensive analytics including score distributions, performance trends, skill gap analysis, and comparative benchmarking. Premium users get access to an advanced dashboard with detailed visualizations, candidate comparison tools, exportable reports, and insights that highlight strengths and areas for improvement. You can also generate custom reports based on specific criteria relevant to your hiring needs.',
        },
        {
            id: 'item-5',
            icon: 'puzzle',
            question: 'How can I create custom assessments for my organization?',
            answer: 'XcelIQ makes it easy to create tailored assessments for your specific hiring needs. Simply select from our library of games, customize difficulty levels for each, and set time parameters. You can organize assessments by department or role, incorporate company-specific scenarios, and save assessment templates for future use. Premium users can further customize scoring weights for different skills and add branded elements to provide a seamless candidate experience.',
        },
        {
            id: 'item-6',
            icon: 'users',
            question: 'How do candidates access and complete assessments?',
            answer: 'Candidates receive a secure link via email to access their assigned assessments. No software installation is required—everything runs in a standard web browser on desktop or mobile devices. The platform guides candidates through each game with clear instructions, and assessments can be configured to allow breaks between games or require continuous completion based on your preferences.',
        },
    ]

    return (
        <section className="bg-muted dark:bg-background py-20">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="flex flex-col gap-10 md:flex-row md:gap-16">
                    <div className="md:w-1/3">
                        <div className="sticky top-20">
                            <h2 className="mt-4 text-3xl font-bold">Frequently Asked Questions</h2>
                            <p className="text-muted-foreground mt-4">
                                Can't find what you're looking for? Contact our{' '}
                                <Link
                                    href="#"
                                    className="text-primary font-medium hover:underline">
                                     support team
                                </Link>
                            </p>
                        </div>
                    </div>
                    <div className="md:w-2/3">
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full space-y-2">
                            {faqItems.map((item) => (
                                <AccordionItem
                                    key={item.id}
                                    value={item.id}
                                    className="bg-background shadow-xs rounded-lg border px-4 last:border-b">
                                    <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-6">
                                                <DynamicIcon
                                                    name={item.icon}
                                                    className="m-auto size-4"
                                                />
                                            </div>
                                            <span className="text-base">{item.question}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5">
                                        <div className="px-9">
                                            <p className="text-base">{item.answer}</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </div>
        </section>
    )
}
