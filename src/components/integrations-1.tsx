import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { Brain, Puzzle, Calculator, Clock, Target, Lightbulb } from 'lucide-react'

export default function IntegrationsSection() {
    return (
        <section>
            <div className="py-32">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="text-center">
                        <h2 className="text-balance text-3xl font-semibold md:text-4xl">Top Assessment Games Used by Leading MNCs</h2>
                        <p className="text-muted-foreground mt-6">We provide a comprehensive suite of industry-standard game-based assessments, the same trusted tools used by Fortune 500 companies for evaluating technical skills and cognitive abilities.</p>
                    </div>

                    <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <GameCard
                            title="Memory Match"
                            description="Used by Google and Microsoft to evaluate short-term memory and information retention capabilities essential for data-intensive roles.">
                            <Brain className="size-10 text-blue-500" />
                        </GameCard>

                        <GameCard
                            title="Word Scramble"
                            description="Amazon and IBM incorporate language games to assess verbal reasoning and communication skills for customer-facing and documentation roles.">
                            <Puzzle className="size-10 text-purple-500" />
                        </GameCard>

                        <GameCard
                            title="Math Quiz"
                            description="Facebook and Goldman Sachs utilize quantitative assessments to evaluate numerical reasoning and analytical thinking for technical positions.">
                            <Calculator className="size-10 text-green-500" />
                        </GameCard>

                        <GameCard
                            title="Speed Challenge"
                            description="Apple and Tesla measure processing speed and reaction time through timed challenges to identify candidates who excel under pressure.">
                            <Clock className="size-10 text-red-500" />
                        </GameCard>

                        <GameCard
                            title="Pattern Recognition"
                            description="NVIDIA and Intel test pattern identification abilities as predictors of programming talent and algorithmic thinking capacity.">
                            <Target className="size-10 text-amber-500" />
                        </GameCard>

                        <GameCard
                            title="Logic Puzzle"
                            description="Oracle and Adobe assess problem-solving through complex puzzles that reflect the challenges encountered in software development.">
                            <Lightbulb className="size-10 text-cyan-500" />
                        </GameCard>
                    </div>
                </div>
            </div>
        </section>
    )
}

const GameCard = ({ title, description, children, link = '#' }: { title: string; description: string; children: React.ReactNode; link?: string }) => {
    return (
        <Card className="p-6">
            <div className="relative">
                <div className="flex justify-center items-center mb-3">{children}</div>

                <div className="space-y-2 py-4">
                    <h3 className="text-base font-medium">{title}</h3>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>

                <div className="flex gap-3 border-t border-dashed pt-6">
                    <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="gap-1 pr-2 shadow-none">
                        <Link href={link}>
                            Learn More
                            <ChevronRight className="ml-0 !size-3.5 opacity-50" />
                        </Link>
                    </Button>
                </div>
            </div>
        </Card>
    )
}
