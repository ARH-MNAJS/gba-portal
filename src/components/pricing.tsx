import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import Link from 'next/link'

export default function Pricing() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h1 className="text-center text-4xl font-semibold lg:text-5xl">Pricing that's just Right</h1>
                    <p>We offer a single all-access subscription that gives you unlimited access to all our content and games—anytime, as much as you like, with no limitations.</p>
                </div>

                <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-5 md:gap-0">
                    <div className="rounded-(--radius) flex flex-col justify-between space-y-8 border p-6 md:col-span-2 md:my-2 md:rounded-r-none md:border-r-0 lg:p-10">
                        <div className="space-y-4">
                            <div>
                                <h2 className="font-medium">Free</h2>
                                <span className="my-3 block text-2xl font-semibold">₹0 / mo</span>
                                <p className="text-muted-foreground text-sm">Per User</p>
                            </div>

                            <Button asChild variant="outline" className="w-full">
                                <Link href="/login">Start Now Upgrade Later ;) </Link>
                            </Button>

                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['3 Free Game Attempts / Month', '3 Company Specific Assesments', 'Basic Practice Analytics', ].map((item, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="dark:bg-muted rounded-(--radius) border p-6 shadow-lg shadow-gray-950/5 md:col-span-3 lg:p-10 dark:[--color-muted:var(--color-zinc-900)]">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="font-medium">Premium</h2>
                                    <span className="my-3 block text-2xl font-semibold">₹199 / mo</span>
                                    <p className="text-muted-foreground text-sm">Per User</p>
                                </div>

                                <Button asChild className="w-full">
                                    <Link href="">Acess Unlimited Assessments</Link>
                                </Button>
                            </div>

                            <div>
                                <div className="text-sm font-medium">Everything in free plus :</div>

                                <ul className="mt-4 list-outside space-y-3 text-sm">
                                    {['Unlimited Game Attempts', 'Unlimited Assessments', 'Create Custom Assessments', 'Video Course Content', 'Company Assessment Wiki', 'Nationwide Leaderboards', 'Detailed Analytics Dashboard', '24x7 Email/Chat Support', 'Priority Company Updates' ].map((item, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <Check className="size-3" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
