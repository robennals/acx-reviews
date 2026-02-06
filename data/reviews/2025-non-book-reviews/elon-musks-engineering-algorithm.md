---
title: Elon Musk’s Engineering Algorithm
author: Unknown
reviewAuthor: Anonymous
contestId: 2025-non-book-reviews
contestName: 2025 Non Book Reviews
year: 2025
publishedDate: '2026-02-06T16:52:48.892Z'
slug: elon-musks-engineering-algorithm
wordCount: 4565
readingTimeMinutes: 21
originalUrl: >-
  https://docs.google.com/document/d/1d0vRSj1E93joWWvbUen2XGuDjN_mM94ybMIAADzM2fo
source: gdoc
tags:
  - Technology
  - Memoir
---

•Make the requirements less dumb.

•Delete parts or process.

•Simplify and optimize.

•Accelerate cycle time.

•Automate.

- ModelThinkers.com, summarizing an interview with Elon Musk in 2021.

From the moment I became interested in the aerospace industry, my understanding of it had been dominated by one story. It went like this:

Long ago, in the Space Race, people were willing to test a lot, fail fast and learn. The US and USSR exploded dozens of rockets in each test program, using their generational engineering talents to refine them to perfection. In doing so, they achieved the transcendental results of the Apollo program.

But over time, conservatism and bad incentives crept into space programs. Good engineering got choked by endless layers of process and review, and people became so terrified of the impression of failure that they would spend a hundred times as much to design perfect hardware.

And so: NASA’s [1969 Space Task Group proposal](https://www.nasa.gov/history/the-post-apollo-space-program-directions-for-the-future/) aimed for a twenty-five-person moon base and nuclear-powered Mars trip in the late 1980s. Instead, fifty years later, we are stuck with boondoggles like the Space Launch System - NASA’s new moon rocket - that [cost more](https://www.gao.gov/assets/gao-23-105609.pdf) than the Saturn V, have less performance, and can launch maybe once every other year.

Throughout this whole period, the rage scream of the space nerds built. It expressed itself in a succession of space companies now unjustifiably ignored by history - [Space Services, Inc](https://en.wikipedia.org/wiki/Space_Services_Inc.), [AMROC](https://en.wikipedia.org/wiki/American_Rocket_Company), [Rotary Rocket Company](https://en.wikipedia.org/wiki/Rotary_Rocket), [Orbital Sciences](https://en.wikipedia.org/wiki/Orbital_Sciences_Corporation) [1]. Finally, amidst a boom in low orbit satellite construction, an eccentric rich person founded a company with a test site in Texas to change rocket launch forever. Then, after building the largest engine since Apollo, Andrew Beal’s [Beal Aerospace](https://www.beal-aerospace.com/) went bankrupt, and its test site was bought by the next challenger in line: Elon Musk’s Space Exploration Technologies Corporation.

Image Source: [Space Exploration Technologies Corporation](https://web.archive.org/web/20030623061458/http://spacex.com/)

By the time I entered the aerospace industry, SpaceX (once known as SET, for “Space Exploration Technologies”) had already carried out one of the great underdog stories in aerospace. From its beginnings exploding rockets in the Kwajalein Atoll, to teenage years releasing hype videos [backed by Muse songs](https://www.youtube.com/watch?v=sSF81yjVbJE) [2], SpaceX had dethroned the entrenched, government-supported monopolies and was rapidly becoming wildly, historically dominant in the space industry.

In the process, it told a powerful story of the secret to its success. The story went like this:

•SpaceX wasn’t afraid of the appearance of failure, which meant that they could learn faster by carrying out tests that might not work.

•Everybody at SpaceX was the cream of the crop and held to high expectations in a hard-charging environment.

•Decisions were made based on “first principles”. There was little stifling process and procedure.

All of this was instantiated through a process of Responsible Engineering. If you were the Responsible Engineer for the pneumatic system, you had absolute power over it, but (hypothetically) any failure on it was your fault. Your capital-R responsibility stretched the whole way - identifying what the pneumatic system was supposed to do, working with all of its stakeholders to individually identify the possible ways it could help or hurt other problems, and finding solutions to every problem.

If there was a great engineer responsible for each thing, the barriers were moved out of their way, and you got to test and fail until you succeeded, the company would win.

To a twenty-three year old engineer, this all seemed so obviously right that it was mystifying to me why anybody had done anything any differently.

*

When The Algorithm arrived - fresh off the presses of Elon’s crushing experience increasing production rate at Tesla - it at first felt unsurprising.

In essence - as a exasperated reader might have noticed - it was a distillation of various extremely canonical Good Engineering Advice.

•Question the Requirements - so you solve exactly and only the problem you’re trying to solve.

•Delete the part - became removing complexity makes problems more manageable.

•Optimize the part - good, but only after satisfying the first two.

•Accelerate - to get more production and enable test, but only once you know it’s the right thing to produce.

•Automate - ditto, and ditto.

All of us seemed to read it as such. We nodded thoughtfully and continued along in the way that people since time immemorial have listened to, but not really absorbed, Good Engineering Advice. But slowly, it became clear that this time was different.

As I worked in the early 2020s, the Algorithm became a mantra around the office. It came up in presentations and one on ones. Our slides were practically required to mention the steps. Within a year, I could recite it when woken from a dead sleep. Steadily, it became clear that this wasn’t advice, it was something new.

Questioning the requirements was an extremely literal thing that you were supposed to do multiple times every single day. I’d make a claim about my system (“hey, if the stuff in this tube gets too hot, my part will explode, so please don’t put anything too hot near it”) and that very afternoon three or four people would stop by my desk, ready to debate.

“Hello,” they would say. “I’m the Responsible Engineer for the Hot Things Near Tubes system,” and then the floodgates would open. What did I mean by near? What did I mean by hot? How hot was too hot? Was it really going to explode? If it exploded, was that really so terrible?

The first time, the debate would be interesting. The second, it would be a bit tiresome. By the first week after a new claim, it was exhausting and a little rote. But you had to win, every time, because if you didn’t, nobody would follow your requirement.

It also worked in the other direction. I learned to pay attention to everything that was happening in the whole program, absorbing dozens of update emails a day, because people would announce Requirements, and I’d need to go Question Them. If I didn’t do this, I’d find my system forced to jump through too many hoops to work, and, of course, I would be Responsible. If I was Responsible for too many things, I wouldn’t be able to support all of them - unless, of course, I managed to Delete the Part and free myself from one of those burdens.

And so when there were requirements, they were strong, because they had to survive an endless barrage of attack. When there were parts, they were well-justified, because every person involved in the process of making them had tried to delete them first. And there were no requirements matrices, no engineering standards, practically no documentation at all.

The key point came in, the reason why it was capitalized. It wasn’t philosophy, it wasn’t advice - it was an Algorithm. A set of process steps that you followed to be a good engineer. And all of us good engineers were being forced by unstoppable cultural forces to maniacally follow it.

There was one question slowly building in my mind. The point of SpaceX was to get good engineers, do first principles analysis, let them iterate, and avoid documentation. This whole process was clearly succeeding at the last three steps. But if we were already so great, why did we have to have this process enforced so agressively?

*

As the time went on and the Algorithm grew, screaming ever-louder about what we should specifically do, the question grew more ever more urgent.

Tell people to ritualize Questioning Requirements and they will do so ritually. You’ll deliver the same explanation for how hot your tube can be a hundred times, and each time you deliver it you think about it less. You will realize that the best way to get work done is to build a persona as extremely knowledgeable and worthless to question, and then nobody ever questions your work.

Tell people to Delete the Part, and they’ll have the system perform ridiculous gymnastics in software to avoid making a 30$ bracket, or waste performance to avoid adding a process.

Tell people to Optimize the Part and they’ll push it beyond margins unnecessarily, leaving it exquisite at one thing and hopeless at others.

Tell them to Accelerate, and they’ll do a great job of questioning, but when push comes to shove they will always Accelerate at the cost of quality or rework, and so you find yourself building vehicles and then scrapping them, over and over again.

There is no step for Test in the Algorithm, no step for “prove it works.” And so years went by where we Questioned, and Deleted, and Optimized, and Accelerated, and Automated, and rockets piled up outside the factory and between mid-2021 and mid-2023 they never flew.

[Source](https://www.bing.com/images/search?view=detailV2&ccid=EpuNfyYv&id=A813CCFC180959A50D806DD2B1AFAC67168DFC71&thid=OIP.EpuNfyYvfeSPmF5nIdxbWQHaFF&mediaurl=https%3A%2F%2Fwww.wereldreizigers.nl%2Fwp-content%2Fuploads%2F2023%2F04%2Fstarbase-spacex-boca-chica-texas-01-2400x1648.jpg&cdnurl=https%3A%2F%2Fth.bing.com%2Fth%2Fid%2FR.129b8d7f262f7de48f985e6721dc5b59%3Frik%3DcfyNFmesr7HSbQ%26pid%3DImgRaw%26r%3D0&exph=1648&expw=2400&q=spacex+starships+and+boosters+outside+starbase&simid=608026460939553977&FORM=IRPRST&ck=824D52D5DAA117E6A67FBA7CC6433E39&selectedIndex=9&itb=0&cw=1343&ch=765&mode=overlay).

Amidst it all, in this approach there is no horrible documentation, but that means that new REs cycling into the program make the same mistakes as the previous ones, and as the RE for your system you need to be aware of every single thing that’s happening on the program all the time to make sure that you don’t miss somebody else’s Requirement that you must Question, and so everybody publishes a 1000 word update email every day and you read all them.

Every engineer was Responsible for their own part. But every engineer had perverse incentives. With all that Accelerating and Automating, if my parts got on the rocket on time, I succeeded. In fact, if the rocket never flew, I succeeded more, because my parts never got tested.

And so we made mistakes, and we did silly things. The rocket exploded a lot, and sometimes we learned something useful, but sometimes we didn’t. We spent billions of dollars. And throughout it all, the program schedule slid inexorably to the right.

And I got cynical.

*

Once, long ago, the aerospace industry faced this exact sort of problem. In the early days of the Cold War, as the USA and USSR poured superpower resources into the development of intercontinental ballistic missiles, the initial result was a continuous stream of failures. The first version of the Atlas missile struggled so much in early flights that technicians called it the “Inter-County Ballistic Missile.” More importantly, the failures were not leading in the right direction - despite years of work and near-infinite money, reliability wasn’t rising fast enough for these missiles to be placed on the firing line.

Many things helped ride to the rescue, but one of the most important was a new field called Systems Engineering.

The first recorded use of the term “Systems Engineering” came from a 1950 presentation by Mervin J. Kelly, Vice President of Bell Telephone. It appeared as a new business segment, coequal with mainstays like Research and Development. Like much of the writing on systems engineering, the anodyne tone hid huge ambition.

 ‘Systems engineering’ controls and guides the use of the new knowledge obtained from the research and fundamental development programs … and the improvement and lowering of cost of services…’

In other words, this was meta-engineering.

The problems were too complex, so the process had to be a designed thing, a product of its own, which would intake the project goals and output good decision making.

It began with small things. There should be clear requirements for what the system is supposed to do. They should be boxed out and boiled down so that each engineer knows exactly what problem to solve and how it impacts the other ones. Changes would flow through the process and their impacts would be automatically assessed. Surrounding it grew a structure of reviews, process milestones, and organizational culture, to capture mistakes, record them, and make sure nobody else made them again.

And it worked! All of those transcendental results from Apollo were in fact supported on the foundations of exquisitely handled systems engineering and program management. The tools developed here helped catapult commercial aviation and sent probes off beyond the Solar System and much more besides.

At SpaceX, there was no such thing as a “Systems Engineer.” The whole idea was anathema. After all, you could describe the point of systems engineering, and process culture more generally, as the process of removing human responsibility and agency. The point of building a system to control human behavior is that humans are fallible. You write them an endless list of rules to follow and procedures to read, and they follow them correctly, and then it works out.

At SpaceX, it wasn’t going to be like that. First principles thinking and Requirements Questioning and the centrality of responsible engineering all centered around the idea of raising the agency of each individual engineer. Raising individual responsibility was always better.

*

But even at SpaceX, even before the Algorithm, it wasn’t always better.

Because of course, that was only for the engineers. Technicians on the program were encouraged to raise issues they noticed, or make suggestions, but, like production technicians everywhere, they were informed to follow written work instructions to the letter in everything they did. The work instructions, as one guide memorably put it, ought to be written assuming that the person carrying them out was “hung over, mid-divorce, and being audited” - in other words, not to be trusted.

What’s the difference? Well, for one thing, for a big production program you need a lot of technicians. It’s possible to train every single one of them to be perfect all the time, but that’s contingent on individual forces of culture and personality, so it’s a lot easier to give them aggressively detailed instructions and expect them to be carried out.

For another thing, for the most part technicians are in the unenviable position of being able to make things worse but not much better. If you do your job right, the part is built correctly; if you do not, it’s probably worse.

But of course, there’s nothing that limits those circumstances to technicians. The larger your organization is, and the more complex the task it has set its mind to, the more difficult it will be for you to train people to execute every element of it flawlessly.

And there are distressingly many contexts - for instance, when making anything with a human safety element - where the cost of failure is so much higher than the marginal gain from improvement that doing your job right means having it be baseline good. If you’re doing it differently, you’re probably making things worse.

Now, SpaceX was different, at first. There were enormous opportunities to have upside improvement in the rocket industry of the 2000s and 2010s. The company was small and scrappy and working hard. The rules applied.

But by the 2020s, even SpaceX was growing large. The company had passed 10,000 people, with programs across the country, tendrils in every major space effort and endlessly escalating ambition.

And the larger it became, the greater the costs to its architecture became. As my program grew from dozens of people to hundreds to thousands, every RE needed to read more emails, track more issues, debate more requirements. And beyond that, every RE needed to be controlled by common culture to ensure good execution, which wasn’t growing fast enough to meet the churn rate of the new engineers.

Enter The Algorithm. It was a philosophy, and it was ritual, and it was a set of rules to do Good Engineering. If you followed it, you would succeed. If you didn’t follow it, your manager would see that you didn’t.

The Algorithm imposed costs, the same way that any attempt to get people to follow a ruleset does. That was the whole point of the responsibility culture in the first place. And it was a pretty lightweight set of rules, vague enough to be complied with across a range of positions. Unless you squinted, you couldn’t tell that anything had changed.

But something had.

Although they sounded like they fit perfectly with the engineering philosophy of the company, in reality they were a sort of surrender.

*

If you were inclined to grand metaphor, you’d be likely to write a review on ACX. So here goes, let’s try one on.

Consider the “systems engineering approach” as analogous to a centrally planned economy. You decide what the requirements are at the beginning and they cascade inevitably downwards. From there, you build your Gantt charts and your Work Breakdown Structures and turn the crank. Out pops who should be doing what and when, just as if you were a Soviet bureaucrat, filling out the population tables to decide how many shoes to make this year.

Like centrally planned systems of days past, it puts forwards the vision of a perfect result - a model that incorporates every issue and outputs the Right Answer, even if the people implementing it are flawed humans. Also like centrally planned systems, it is brittle to new information and can choke itself in process.

One might consider the “Responsible Engineering” system, then, to be a market system. Nobody can keep in their head the interlocking relationships that define the rocket engineering problem. Instead, every person in the machine is given incentives to get their part right and set to battle. Nobody in the system really has insight into the whole process, but the optimum design emerges via competition.

Except that it’s not a great metaphor. First, the problem with a competitive model of engineering is that, unlike in an economy, everyone needs to succeed. The economy is fine with bad companies dying, but the rocket doesn’t work if any part dies. So everybody needs to be really good at doing market economics and very in balance with one another. You can help that with aggressive and continuous purging of faltering employees - if you have an endless line of excellence out the door. But even so, continuous excellence requires a small enough scale to control culture very tightly.

Second, it still runs into a complexity ceiling. The whole rocket has to work, which means that people can’t just optimize for their local success - they all need, to some extent, to keep the entirety of the system in mind. And all the market actors are individuals - that’s how you’re avoiding the bureaucracy - which means that they run into an abstraction scale limit.

But most of all, the metaphor is bad because command economics has a reputation of having failed, but centralized engineering hasn’t. In a sense, that’s what capitalism is, a whole bunch of legal dictatorships called “corporations”, the majority of which operate on an largely centralized model.

The weaknesses of the centralized approach are circumstances that don’t fit the rules - ones where there are new capabilities to be built, continuous improvement to be achieved, and room for some churn along the way. Over fifty years since Apollo, the aerospace industry, that great metaphor, had drifted in this direction, and the old culture had made it hard to change.

But there are other kinds of projects. If you’re building a bridge, you might not be reinventing the truss, but your success is determined by exquisite execution on a thousand little problems the first time - by a process system. We design factories as systems that build a thousand cars a day, perfect every time. We make logistics networks that fill our stores with fresh food, just in time. We have building codes and airplane rules and food safety standards because they work.

The SpaceX responsibility approach is a good one, but it’s not for everything.

*

Okay, so the answer is easy here. Various different approaches towards engineering can  coexist, all doing their part, sometimes in the same company. The world is complicated, false dichotomy, etc, etc, you’ve read this essay before.

But there’s a story here, a powerful one, the same one that drove me when I started, that makes it hard to look at things like that.

For one thing, the Responsible Engineering approach is so much more fun. Both approaches have advantages and disadvantages, but the RE one works best when exploring a new concept with a small, focused team of unusually talented people, and wow, just writing that sentence locks me back into wondering how I could ever do anything else. Of course everybody wants to say that that’s how they think, of course every founder pitches their company like that. It’s narrative, even when it’s wrong.

And beyond that, it’s all about SpaceX.

SpaceX is a company that’s so weird that in a worldbuilding project I would have considered it unrealistic.

It’s the space industry’s Mary Sue, dominant, impossibly competent. Today, they launch multiple times a week while others launch a few times a year; they operate more satellites than the rest of humanity put together; they landed a rocket a decade ago and nobody has matched them since. Arguably, huge portions of the modern NASA policy of awarding single fixed-price contracts are a success only because of SpaceX - consider the commercial crew contract, on which SpaceX has been flawlessly delivering since 2020 but Boeing still can’t manage. In the industry, every discussion goes back to them, desperately trying to divine the secrets of their success, or figure out how to compete, or complain that they cannot be beaten.

Most of all, SpaceX is seen as having fixed the space industry. It did what AMROC and Orbital and Beal didn’t - shake up the incumbents, solve the problems, and bring about the glorious future of landing rockets.

And in the process, they’ve thrown down a gauntlet. If they can revolutionize the space industry so crushingly, then people should be able to revolutionize other industries just as much. Just as the Apollo landings told people a story about what government could accomplish (“if we can land a man on the moon, why can’t we …”), SpaceX tells a story (“if we can land a rocket on a boat, why can’t we …”) that’s about private enterprise, or first principles thinking, or whatever else the storyteller wants.

So today, as SpaceX churns onwards through workforce, an ever-growing percentage of the economy is filled with firms with founders whose LinkedIn profiles say “Former SpaceX” in their headline. So much of this is hopeful and delightful, as people ride back into industries like nuclear that had long been abandoned by excitement. It’s an opportunity to take another look at old books from the sixties and ask: can we do this better? Are the rules we set wrong?

And in the process, a million eyes stare at SpaceX and wonder how they can capture the magic. Small changes in how SpaceX executes matter, for the industry and the rest of the world.

*

This essay started off with a story of great disappointment, the climax of the Apollo program and the painful denouncement decades of slow progress that came out of it. Apollo created impossible hope and inspired millions to try and make their engineering dreams a reality. But its methods had limits that became painfully apparent over time, and the consequences of over-committing to those methods reverberate until SpaceX overthrew them.

Today, SpaceX is dominant. Some of that dominance is their supernatural competence. But of course they are no longer a scrappy startup; now they also have infinite access to capital, infinite talent, infinite production scale, technology moats in every direction. Despite the fact that their rockets are now much cheaper than any similar past rocket, despite the fact that instead of falling in the ocean they land on boats and fly again, launch customers like [NASA have to pay more than they paid Lockheed and Boeing in the 90s.](https://arstechnica.com/space/2025/04/reusable-rockets-are-here-so-why-is-nasa-paying-more-to-launch-stuff-to-space/)

Out of SpaceX came a rush of companies, all riding on the promise that this time it would be different. Many have failed catastrophically in the subsequent years. Some have not. Maybe a hardscrabble industry is dragging itself into existence in the giant’s wake.

Within SpaceX, there are the barest hints of limits. Limits to scale, limits to the approach. They’re getting embarrassed by test failures. The rules are creeping back. Now there’s an Algorithm, to make sure people are doing it right.

And beyond SpaceX, we all desperately try to grab what they’re doing, picking things that are legible enough to copy, to slam into submission all the frustrations in our world.

There are so many places where systems have failed us. It feels obvious that if only we could get the best people, cut the rules out, and let them work, it could fix everything.

But SpaceX is now old and successful enough that it’s not clear which things made it successful.

I contend that The Algorithm is not one of them.

I do not mean that it doesn’t work, or that it’s the wrong tool. (I also think it’s probably gently more applicable to a field like car production than one like rockets for reasons that don’t really fit in this review). It might be the right tool, but it obscures rather than heightens what made SpaceX work. It’s an attempt to make legible the illegible, to systematize the lack of system.

*

The dream of individual responsibility as a solution to engineering problems is one that is heroic, capable, antifragile.

We love that idea, we think it’s cool and exciting. We want it to be everywhere. But by nature it is hard to copy, hard to systematize, and hard to rely upon.

*

The dream of system responsibility as a solution to engineering problems is one that is legible, stable, solved.

It’s easy to copy and scale, but a bit disappointing, and has a hard time being responsive.

*

The pendulum swings back and forth between responsibility lying in the individual and the system. Both of them have limits grounded in our humanity. Maybe even the combination of the two has a limit, and humanity as it stands has a weak upper bound of possible complexity, of problems we can take on.

I’d like to believe that we’re doing more than swinging back and forth, that we’re growing every time, reaching a more perfect synthesis.

I don’t want us to swing in any particular direction because that’s the narratively satisfying thing to do.

I don’t work at SpaceX anymore. I don’t know if the Algorithm phase has ended or if there’s something new.

I admire the problem it’s trying to solve - to take the approach of individual responsibility and pin it to a pinboard, preserve it, make it automatic, make it easy, make it understood, make it come off the assembly line and scale to the stars. I love thinking that way, I hope that it’s possible.

I do keep watching SpaceX’s future, because it’s now the vanguard for a model that is having its moment to go everywhere.

Time will tell how far it can go.

[1] Annoyingly, people sometimes say that SpaceX was the first private company to reach orbit, when in fact Orbital Sciences was fairly regularly launching - from a plane - years beforehand, and Space Sciences, Incorporated had reached space privately years before that. Rotary Rocket, on the other hand, was objectively insane.

[2] Strongly recommend the comments on this one, as everybody from back in the 2010s comments perfectly sensibly on how absurd it would be to have a private company supply the ISS with a fully reusable rocket.
