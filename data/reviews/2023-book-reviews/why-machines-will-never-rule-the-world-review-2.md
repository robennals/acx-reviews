---
title: Why Machines Will Never Rule the World (Review 2)
author: Unknown
reviewAuthor: Anonymous
contestId: 2023-book-reviews
contestName: 2023 Book Reviews
year: 2023
publishedDate: '2023-01-01T00:00:00.000Z'
slug: why-machines-will-never-rule-the-world-review-2
wordCount: 2641
readingTimeMinutes: 12
originalUrl: https://docs.google.com/document/d/1D2MGZ7HW1vRtOtfXYIx9BBUt6ubjEA2n06gpoHcxaFY
source: gdoc
tags:
  - Philosophy
  - Technology
  - Psychology
---

By J.S.

My excitement for diving into _[Why Machines Will Never Rule the World](https://www.amazon.com/Machines-Will-Never-Rule-World/dp/1032309938)_ was twofold. First, as a human with a fondness for our species' current planetary supremacy, it's comforting to know we won't be dethroned anytime soon. Also, it's nice to think that humanity's ultimate accomplishment might be a little more inspiring than turning itself into a pile of paperclips. Amidst the doomsday predictions and existential threats, Jobst Landgrebe and Barry Smith (L&S) have penned a timely and thought-provoking new book to allay our fears. According to L&S, these concerns are unfounded. “Relax,” they say. “Machines will not rule the world.”

To defend their thesis, L&S embark on a multidisciplinary journey, delving into neuroscience, linguistics, complexity theory, ethics, psychology, biology, and the limits of mathematical modeling. Both authors claim extensive experience in relevant fields. Jobst Landgrebe is the founder of German AI and biotech consulting company Cognotekt. Barry Smith, one of the most widely cited living philosophers, has made significant contributions to the fields of ontology and biomedical informatics. Together, they scrutinize the assumptions underpinning AI takeover anxieties and conclude that the risk is fanciful. Not only will AGI never turn against humans, they assert, it will never exist. Not today. Not tomorrow. Not ever. Fundamental computational limitations make AGI impossible. The robot apocalypse has officially been canceled.

But first, we need to step back. What _is_ intelligence? L&S identify two relevant definitions. The first is by Max Scheler, who described intelligence as “the power of making a meaningful response in the face of a new situation.” The second, which they consider the current consensus, is stated by Linda Gottfredson: “A very general mental capability that, among other things, involves the ability to reason, plan, solve problems, think abstractly, comprehend complex ideas, learn quickly, and learn from experience.”

L&S refer to Scheler’s definition as “primal intelligence” and Gottfredson’s as “objectifying intelligence”. They claim that many birds and mammals exhibit primal intelligence, but only humans possess objectifying intelligence, and it is the fusion of primal and objectifying intelligence that defines human intelligence.

What, then, is machine intelligence, and how does it differ from conventional intelligence? They offer the definition from Shane Legg and Marcus Hutter’s 2007 essay [Universal Intelligence: A Definition of Machine Intelligence](https://arxiv.org/abs/0712.3329). After examining scores of definitions, Legg and Hutter concluded that intelligence, in its most general form, “measures an agent’s ability to achieve goals in a wide range of environments”. L&S discuss this definition but ultimately dismiss it as being too restrictive—lacking the “suddenness, untrainedness, and novelty” of primal intelligence—and simultaneously too broad, allowing even nematodes to be deemed intelligent. They insist that machines must have both primal and objectifying intelligence to be considered AGI.

L&S' definitions, while comprehensive, can be somewhat unwieldy. Fortunately, they provide us with a single condition that is both necessary and sufficient for AGI: the mastery of language. And to test it, they propose a modernized Turing Test:

1.  The machine must be able to have a natural conversation with one or more humans without them feeling restricted or needing to exert additional effort due to the machine's limitations. They should be able to talk about anything, ask trick questions, and expect the machine to generate novel content.
2.  The conversation should flow like a normal conversation and not a specific question-and-answer pairing.
3.  The conversation is spoken.
4.  The machine should be able to see the people and respond to their body language and facial expressions.

L&S' updated Turing Test differs significantly from other versions. In particular, the fourth requirement necessitates reading human facial expressions and body language, which is lacking even in the [stronger operationalization of AGI on Metaculus](https://www.metaculus.com/questions/5121/date-of-artificial-general-intelligence/). Conversely, the Metaculus test requires enough manual dexterity to assemble a model car, whereas L&S' version doesn't require any manipulation of physical objects. It is interesting that they included trick questions as part of the test. Trick questions exist because they are intended to trick humans. I don’t think there’s anything wrong with including them, per se, but you can’t conclude that someone isn’t generally intelligent if they fall for one. (I mean, you _can_, but should probably stop after middle school).

![](https://acximages.ennals.org/images/2023-book-reviews/57e4c3ddbfdf7562.png)

DALL·E 2: A robot assembling a model car on a futuristic neon table with dense fog in the background, 85 mm

Their provided definitions of AGI, the reliance solely on language as a requirement, and their Turing Test seem to be misaligned (e.g., reading body language shouldn't be necessary if mastering language alone is sufficient). However, I generally avoid getting too caught up in definitions of AGI. Unfortunately, it’s not a “we'll know it when we see it” situation either. More likely, we'll engage in endless debates about whether each new breakthrough truly qualifies as "AGI." But at some point, hopefully at least _several_ minutes before it happens, people should realize that whether the entity turning them into paperclips meets their specific definition of AGI is not particularly important.

With AGI definitions out of the way, L&S get to the heart of the topic. Can a computer develop AGI? To proceed further, we need to understand a bit about logic systems and complex systems. Logic systems have well-defined rules and clear relationships between the inputs and outputs. They are commonly found in math textbooks but not as much in the real world. Complex systems are much more… well, complex. L&S lists seven specific properties that complex systems have:

1.  “Change and evolutionary character”—they exist in a dynamic system with non-differentiable or non-continuous changes
2.  “Element-dependent interaction”—the elements of the system interact in a way that leads to irregular and non-repeatable behavior
3.  “Force overlay”—at least two of the four fundamental forces (strong, weak, electromagnetic, and gravity) act upon the system
4.  “Non-ergodic phase space”—the system cannot be represented or predicted by a sampling of it
5.  “Drivenness”—either an internal or external energy drives the system forward
6.  “Context-dependent”—the surrounding context makes the system behave in new ways
7.  “Chaos”—observers are unable to predict the system behavior given exact starting conditions

Complex systems are all around us. In fact, unless you spend a lot of time hoisting spherical cows on frictionless pulleys, you’re not going to see many systems that _aren’t_ complex.

Here comes the crux of the argument and, really, the whole book. AI runs on a computer, which means that in generating outputs, it must execute a sequence of mathematical functions. Each of these functions must be computable in the Church-Turing sense, which establishes constraints on the types of programs that can run on a computer. Consequently, such programs must rely on mathematical models with computable outputs. As a result, any mathematical model executed on a Turing machine can only represent logic systems, effectively excluding complex systems from the realm of possibility.

The human mind is, without a doubt, a complex system. This means that we won’t be able to run an emulation of it on a computer, which is basically what AGI is—a mind running on a computer.

No AGI. Machines will never rule the world. Book review wrapped up; we can all rest easy. Except, I have one question: Can machines _approximately_ rule the world? Imagine if, hypothetically, a company took a very general architecture and said, [what if we made the whole world the training distribution](https://www.youtube.com/watch?v=Rp3A5q9L_bg&t=503s)? How powerful could it get?

Call it AGI or not (I would, but let's move on), couldn’t a machine capable of interacting with the entire distribution of data on the Internet, replicating itself, and operating at lightning-fast speeds still possess enough power to "rule the world?" If it could subjugate the entire human race, then the distinction between ruling and approximately ruling doesn’t seem important. Sure, a few defiant atoms originating from the remains of the last rebellious humans might result in an unbecoming blemish in the AI's otherwise flawless paperclips, but this difference hardly seems worth celebrating.

![](https://acximages.ennals.org/images/2023-book-reviews/b0923c4097ef6930.png)

The last act of humanity. We really showed those machines. (Thanks DALL·E 2 for helping me show them who’s boss.)

Language is a focal point in their analysis, so it's worth examining closely. Language is inherently non-ergodic, meaning that we can't obtain a representative sample no matter how much data is collected. L&S say it’s a complex system, so the next utterance is unpredictable based on previous acts and the current context.

The problem is, if you accept this argument, you end up making statements like, "machines cannot learn to conduct real conversations using machine learning," which happens to be a direct quote from the book. There probably exists, somewhere, some definition of a “real” conversation that excludes all interactions I’ve had with chatbots, but their statement really flies in the face of my experience with ChatGPT. As everyday AI systems continue to advance, L&S's objections increasingly lose their potency. Many of their claims simply don't hold up when tested with today’s capabilities.

I accept that language is incredibly context-dependent. The meaning of a word, phrase, or sentence depends on the surrounding context. This is one of the criteria for calling language a complex system. It is also precisely what the [Winograd Schema Challenge](https://commonsensereasoning.org/winograd.html) is about (and its larger and more difficult cousin, [Winograde](https://arxiv.org/abs/1907.10641)). These are datasets of sentences that were deliberately created to be ambiguous and difficult for an AI to determine. Below are some examples of these types of sentences.

![](https://acximages.ennals.org/images/2023-book-reviews/18869e16d9ebaa67.png)

L&S claim that neural networks are context-free and therefore cannot cope with context-dependent systems. This claim is hard to square with the fact that [many LLMs have surpassed 90% accuracy on the Winograd test](https://arxiv.org/abs/2201.02387). Even Winogrande is looking increasingly solved, as shown in the [GPT-4 technical report](https://cdn.openai.com/papers/gpt-4.pdf).

![](https://acximages.ennals.org/images/2023-book-reviews/d2386776839d3605.png)

At times like this, when their claims seemed completely at odds with the evidence, my confidence in their arguments wanes. They attempt to defend their theory against the mounting evidence by saying that AI chatbots only work in narrow domains, but the range of topics I’ve covered with ChatGPT would suggest that their definition of “narrow” is “everything under the Sun”. At times, they seem so entrenched in their theories that they resort to linguistic acrobatics to preserve them. When they argue that AlphaGo did not teach humans new moves, they say: “What really happened is that the (human) master observed the emanation from the implicit gain-maximising model set up by AlphaGo’s (human) creators (namely, the moves it played against him) and he used this to adapt his strategy.” At some point, it just feels tiresome.

L&S are entirely dismissive of the idea of a generalist chatbot. The success of ChatGPT, the fastest adopted product in history, highlights the immense value of these systems. Throughout the book, the authors regard AI as so inherently limited, at one point even stating that it could never match the cognitive performance of a crow. I asked ChatGPT to respond to that.

![](https://acximages.ennals.org/images/2023-book-reviews/7663e38b01f44308.png)

They apply the same basic argument to other topics throughout the book. They start with the premise that to create a software emulation of X, it’s necessary to have a mathematical model of X that can predict X’s behavior. Then they show that X is a complex system, and because it’s impossible to build mathematical models for complex systems, it’s impossible to create a software emulation of X. You can see how they got their argument against AGI just by plugging “the human mind” in for X.

Once you see the basic argument of the book, the outcome of each section seems rather inevitable. Anything built upon a complex system is itself complex, so fields like law and social interaction, which are built upon language, are complex too. Thus, we can never expect a machine to do them to any significant degree. The discussions on morality and ethics follow similar lines of thought. Some of the deep dives were interesting, but in truth, the details of why they’re complex don’t seem all that important. If you readily accept that these systems—the mind, language, biological organisms, law, and so on—are complex, you start to wonder if discussions about protein phosphorylation and ATP would have been better off in an appendix.

It’s worth noting that L&S’ opposition to any possibility of AGI occupies what I would consider to be an extreme position. Though I believe AGI is possible, notice that I never said it’s here today or that it will come from LLMs or even from currently known techniques. Many people, such as Gary Marcus, the Internet’s favorite deep learning-naysayer, believe the potential of LLMs is overhyped. He believes that AGI will come one day by combining elementary algorithms with prior knowledge. L&S argue that he, too, is wrong. AGI will never work, no matter what we do.

L&S argue that the mathematics needed to create AGI not only doesn't exist but will likely never exist. They claim that the only way to achieve AGI is through hypercomputation, which would enable machines to produce outputs that are not Turing-computable. However, hypercomputation is a theoretical concept and there is no concrete evidence that it is even feasible. Even quantum computers would not help because while they are faster, they are still Turing machines and therefore cannot perform hypercomputation. They can solve the same problems as classical computers, only faster. This is a big deal for cryptography but from L&S’ perspective, it’s irrelevant for AGI.

The latter part of the book veers into more futuristic possibilities and, essentially, disagrees with all of them. Ray Kurzweil's singularity is impossible. [David Chalmers offers two approaches to AGI](https://consc.net/papers/singularity.pdf): brain emulation and machine evolution. L&S claim both are impossible, relying on the basic premise we’ve already covered. They also say that machines cannot have consciousness. The best we should ever hope to achieve is an emulation of consciousness.

![](https://acximages.ennals.org/images/2023-book-reviews/1a4aca707937c892.jpg)

Eliezer Yudkowsky's idea of mail-order biomolecules being mixed to create artificial life that annihilates humanity is “on very, very many levels, scientifically absurd.” Although they disagree with Yudkowsky on nearly every point of AI capability, they end up oddly aligned when it comes to what _not_ to do. L&S think scaling up general chatbots would be a bad idea because they still won’t work, and Yudkowsky thinks scaling up general chatbots would be a bad idea because they might kill us all. So they agree: Don’t build GPT-5. They respond to Nick Bostrom’s book _[Superintelligence](https://www.amazon.com/Superintelligence-Dangers-Strategies-Nick-Bostrom/dp/1501227742)_ by saying the basic concept of artificial superintelligence isn’t even logically possible. They disagree with virtually every approach described in Bostrom's book. To sum it up, they suggest that “philosophers and mathematicians (and all other persons of sound mind and body) should henceforth work intensively on topics as far removed as possible from science fiction a la Bostrom.”

![](https://acximages.ennals.org/images/2023-book-reviews/82c71af5c4781538.png)

L&S claim to be AI optimists and end with a list of what AGI _can_ do. But their list seems terribly myopic. They are proponents of AI for non-complex systems. They say AI works well in logic systems where it’s possible to model the system using multivariate distributions and in context-free settings. This includes, they tell us, the solar system, the propagation of heat in a homogenous material from one point, and the radiation of electromagnetic waves from a source. They tell us there are applications in industries such as farming, logging, fishing, and mining. But if the requirements of being non-complex are not satisfied, AI can at best provide limited models.

They argue that the applicability of AI in the service sector will be much more limited, as much of it relies on the use of language and is therefore built upon complex systems. This includes sectors such as healthcare, media, professional services, waste disposal, prostitution, education, and gambling. Personally, I find their list baffling, as I have used AI for three of these tasks myself

The AI revolution is happening in front of their eyes, yet L&S do not see it.
