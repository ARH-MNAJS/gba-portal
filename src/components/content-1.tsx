import Image from 'next/image'

export default function ContentSection() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
                <h2 className="relative z-10 max-w-xl text-4xl font-medium lg:text-5xl">Our adaptive algorithm tailors assessments to your needs.</h2>
                <div className="grid gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24">
                    <div className="relative mb-6 sm:mb-0">
                        <div className="bg-linear-to-b aspect-76/59 relative rounded-2xl from-zinc-300 to-transparent p-px dark:from-zinc-700">
                            <Image src="/payments.png" className="hidden rounded-[15px] dark:block" alt="assessment algorithm illustration dark" width={1207} height={929} />
                            <Image src="/payments-light.png" className="rounded-[15px] shadow dark:hidden" alt="assessment algorithm illustration light" width={1207} height={929} />
                        </div>
                    </div>

                    <div className="relative space-y-4">
                        <p className="text-muted-foreground">
                            XcelIQ's assessment platform goes beyond standard testing. <span className="text-accent-foreground font-bold">Our proprietary algorithm generates customized exams</span> — tailored to each company's specific requirements and selected difficulty level.
                        </p>

                        <div className="pt-6">
                            <blockquote className="border-l-4 pl-4">
                                <p>This has made hiring feel a lot less like a chore. It keeps candidates engaged and gives us a clearer picture of their skills—way better than traditional tests.</p>

                                <div className="mt-6 space-y-3">
                                    <cite className="block font-medium">Zahir Alam, TPO</cite>
                                    <img className="h-5 w-fit dark:invert" src="https://html.tailus.io/blocks/customers/nvidia.svg" alt="Nvidia Logo" height="20" width="auto" />
                                </div>
                            </blockquote>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
