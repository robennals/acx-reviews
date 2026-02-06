---
title: "The Monty Hall Paradox"
author: "Unknown"
reviewAuthor: "Anonymous"
contestId: "2022-book-reviews"
contestName: "2022 Book Reviews"
year: 2022
publishedDate: "2026-02-06T07:22:32.818Z"
slug: "the-monty-hall-paradox"
wordCount: 3357
readingTimeMinutes: 15
originalUrl: "https://docs.google.com/document/d/100kMdSVFviZSSBvUyyEQPMNlvLptVQxHFD9i9wGuBWs"
source: "gdoc"
---

Why is the [Monty Hall problem](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Monty_Hall_problem&sa=D&source=editors&ust=1770366145341321&usg=AOvVaw3HylMqSFcyQAFhgDs3Itop) so counterintuitive?

I assume that most readers are familiar with this paradox, but, in case you don’t know about it, here it is:

In a TV game, there is a prize (a car) hidden behind one of three closed doors. The other two doors contain goats because our decadent western culture doesn’t value goats any more. You try your luck and pick one door. Before opening your door, the host opens another door, revealing a goat! Then he asks you if you want to go on with your choice or switch to the remaining door. What do you do? Think about it then look up the solution on the [Wikipedia article](https://www.google.com/url?q=https://en.wikipedia.org/wiki/Monty_Hall_problem&sa=D&source=editors&ust=1770366145342030&usg=AOvVaw25SKGOei0ZkTTBrVEqrz58).

Done? Now I’ll tell you about the first time I encountered this thing. I was at a Physics summer camp. At dinner, one guy is running the show by flabbergasting us with all sorts of counterintuitive trivia. Like, did you know that whenever you copy a file the computer introduces thousands of errors in the copy? Then he starts telling about this survival puzzle where you have two doors and there is a tiger behind one of them. He asks: what door do you choose?

        Me: …

No ok wait there are three doors, and one leads to the tiger. And one leads to the goat. No wait wait I have it there are two goats, one tiger, you are about to open the first door, but your dumb comrade that never agrees opens the second door and finds a goat. The weird fact is that now you should switch to the third door if you want to find the tiger!

        Weren’t we trying to avoid the tiger?

Ahahah I’m dead then—uhm—yes well it’s the same it means you have to go on with the first door, but now you are more sure it does not contain a tiger. And this just by opening an unrelated door with a goat.

I don’t believe this. Our choices are not related in any way to the true tigerness of the doors, so it should make no difference if, excluded the second door, I switch between the first and third.

I know, I know, it’s paradoxical, but it works for real! Because: the total amount of tigerness in the first door is still 1/3 from before, but the tigerness in the third door is 1/2 now, so the first is safer.

I’m still not convinced. This is about probabilities, so imagine repeating the situation many and many times over, each time assigning the tiger to a door at random. Excluded the unlucky to order 0 cases in which the dumb friend meets death immediately, by symmetry the times where the tiger was in the first door are as many as those where it was in the third, because we can relabel the doors switching 3 and 1 without this affecting the randomness of the assignment.

Mmmmm I’m not sure, you want to avoid the tiger in your once-in-a-lifetime specific situation, it does not make sense to think about what you would do in a hypothetical repetition. I think you should compute probabilities in the way I showed you, directly with what you know at each step of the game.

No, because by the law of large numbers, the probability is the relative number of times something happens if you imagine repeating it infinite times. So if the result is different, there must be something wrong in your reasoning.

Ok… if you invoke the law of large numbers, I think it’s powerful enough to dispel the paradox.

Whiz reader quiz: was the avoid tiger version equivalent to the original achieve car version? Spoiler: not at all, the trick doesn’t work any more! Think about it then read the Wikipedia article, without skimming this time!

[Dear anonymous dinner time storyteller: I’m doing an injustice to you. An injustice because probably you told the paradox in the correct way for it to be a paradox instead of the wrong way I’m retelling it such that I happen to be right. Moreover, I never made such well rounded arguments involving symmetries and probabilities, I just shouted “BUT LAW OF LARGE NUMBERS!!!” But, you see, now I have piled academic credentials over academic credentials, my path is strewn with the dead bodies of squirrels, and I can write my version of the story on a popular blog for everyone to read and laugh about your stupidity. WHO CONTROLS THE TIGER NOW?]

Now that the filler story intended to stop the reader from easy-peeking the solution is over, we can resume with what Pearl has to say about the paradox. The most important thing is:

Paul Erdos, one of the most brilliant mathematicians of modern times, likewise could not believe the solution until a computer simulation showed him that switching is advantageous.

This is extremely important because not getting Monty Hall’s paradox kept a dent in my pride for a long time and now, thanks to Pearl, I can say “not only PAUL ERDOS himself got it wrong, he wanted to see EXACTLY THE SAME THING I wanted, an infinite repetition of the experiment.” (Yes, I know, it was already in the Wikipedia article, but I wasn’t reading the English Wikipedia article at the time, you anglo-entitled colonizers!)

Now that my honor is reestablished, we can look at minor details, like understanding the paradox.

Pearl argues that the paradoxical quality of this problem stems from the instinctive tendency of humans to search for causal explanations. “My arbitrary choice of door cannot cause the car to switch door!” Yet the probability changes, without involving any causation. It’s just probabilities, and your brain isn’t wired to weigh plausibility under uncertainty, it’s wired to blame people, which involves finding the cause of something such that you can put blame on it. There are other important details that matter, like in the tiger example above where it’s indifferent to switch door due to a slight modification of the problem, but the reason why the result appears strongly counterintuitive to many people, even when given unambiguously the correct statement, must reside in how we innately tend to represent the situation in our mind.

I could go on Pearlsplaining all this stuff with causal diagrams, like I planned many years ago. But then I thought: who cares? I mean, people who really care will read Pearl’s book anyway. Probably the serious one instead of the dummy version I’m reading because I’m lazy. So, how do I actually explain this stuff in a way that appeals to people who would probably never spoil their free time reading a math textbook?

I was wondering about this while walking in the woods at sunset, and as usual I started a mental dialogue with an imaginary interlocutor. So this interlocutor wanted to know what was I talking about, and I started explaining all things about arrows of causation, confounders, etc. As I explained he interrupted continuously asking all sorts of mischievous mathematical questions aimed at finding a crack in any step of my reasoning, so at some point I realized I was imagining a synthesized version of my university friends or maybe myself. But, who would want to discuss with a persnickety fake Physicist? So I switched to imagining a nice girl, a mythical creature appearing in the narrations of those brave people who ventured outside of the Physics department and managed to come back, who in the stories always listens to everything you want to say, and then in the end always pats you on the head and says you are a “good little mouse.”

The imaginary girl—the image of whom was just a faint ghost in my mind because nobody can see its true appearance and survive, they say—dutifully listened to my ramblings, without ever interrupting. But this turned out to be a double edged sword, because at some point I could sense I was losing her! She was getting bored! What a new, difficult kind of daunting task I had set myself up to… I had to keep entertained an idealized girl! How to accomplish this? I ran the squirrels hard and got some ideas about it; putting in some effort, finally I managed to produce a dialogue with a girl explaining Pearl’s version of the Monty Hall paradox without losing her attention.

You are about to read this dialogue. There is, however, a slight difference with respect to the original version. Some friends read an early draft and advised me to revise it because it sounded too “misogynist.” It is a Greek word which means “against females.” So I asked what has this to do with females, and they started to say confused stuff about like it’s not really against, but it might sound like you assume that the girl is not getting this and that, you see, because depending on the context, etc. The little lecture sounded like they were going around something without quite getting at it. I couldn’t see clearly, but after a while, I don’t know how, I started to parse the babble. Connect the dots. And all of sudden, a revelation struck me with full force, strong and pure in its simplicity, putting all the pieces of the puzzle together at once: the females were the girls all along!

So I changed the interlocutor from “girl” to “female” to remove the unintended misogyny.

Me: Do you know about the Monty Hall Paradox?

Female: Yes.

Me: Wrong answer, I'll explain it to you. There's a TV game show with three doors of which you have to pick one. Behind one door there's a car, behind the others there are goats. It is assumed that you want to win a car and not a goat. The host (Monty Hall) lets you choose a door, let's say you choose door number 1. But before opening it, to waste time, he opens door 2 and finds a goat (of course he already knew that it didn't contain the car, otherwise he would spoil the game). Then he asks: "Now that you have seen a goat behind door 2, do you still want door 1 or switch and choose 3?" What should you do? Switch, stay, or it doesn’t make a difference?

Female: Wouldn't these goats bleat? Anyway I told you I already know, you have to go with 3.

Me: Ok, but why should you choose 3?

Female: List all possible cases, count those where you win if you pick 3, there's more, done.

Me: Ok, but it's a paradox because it shouldn't be the intuitive answer, isn't it? The intuitive answer is that it makes no difference; once you have excluded door 2, the fact of having chosen door 1 beforehand doesn't make it more or less likely that door 3. And the goat is a silent animal.

Female: So, these penises you promised earlier?

Me: In a moment, we first have to draw a causal diagram. Consider these three variables: which door hides the prize, which door you have chosen, which door Monty Hall opens. Imagine representing them with little dots and linking them with arrows, where each arrow goes from cause to effect. So we have to link the prize door to Monty Hall's one, because he can't open the prize door, and also the chosen door because he can't open that either.

Female: Good, he's drawing arrows now. [makes a well-known gesture with the hands]

Me: The point of this diagram is that in general when you have two causes of the same variable, and you know what value the variable yields, a correlation pops up between the two causes, even if there isn't a direct causality relationship between them.

Female: So wouldn't the arrows run opposite? Like, the way you say it, the effect has an effect on the cause, it doesn't make sense.

Me: It's an epistemological thing, what you know about the effect has an effect on what you know about the cause. For example, if you find a bite, you infer you have been bitten by a mosquito, but the cause of the bite is the mosquito.

Female: So you managed to make the obvious clear as mud. Epistonks. About that, the dicks?

Me: Imagine that I take you and your mother

Female: Oh!

Me: ...and send you around with a little notebook to stop people at random and measure their penis length. When you measure them they are erected, when your mother does, they are not.

Female: This really must have set your brain back some juice. But wouldn't my mother get some erections too? Didn't you like mature women?

Me: It doesn't matter, it's a statistical thing, it is actually sufficient that you get harder mickeys than mom on average. On your adorable little notebooks you pencil down age and length. Finally you bring the notes back to me, I fill an excel and group the data by penis length rounded to the centimeter.

Female: And find out that you got a small one.

Me: No, in each group I compute the mean age separately for yours and mom's, and it turns out that—surprise!—for any penis length, yours are younger.

Female: Surprising as fuck! Should I stop oldtimers??

Me: But I told you to stop people at random! At random means like drawing from an urn, you can't pick them!

Female: Man you made your example yourself!

Me: But... Listen, the point is: from this analysis, could I infer that you girls contravened my crystal clear scientific directions? Nope, because it's actually a paradox equivalent to Monty Hall. The finding that you measured younger guys is a statistical illusion, much like the correlation between the door you fix on initially and the one with the prize. Ok actually the anticorrelation because you have to switch door.

Female: But: if I really have to change the door, then it is not an illusion.

Me: Whatever, it's an illusion in the penises case, what the two examples share is an unexpected correlation. Anyway, it becomes evident if we draw the diagram:

Me: So, who out of you and your mother is carrying out the measurement influences the length due to the differential erection rate. Age matters too because children have it small.

Female: Every mile a pedo-phile, du-di-du....

Me: ...The arrow structure is the same as before, and the other thing in common is that the variable influenced by the other two is the one we are "fixing": with doors, we know which door Monty's opened, with penises, I group by length and do the calculation one length at a time, so it's like it's fixed.

Female: A nice story. Let me guess: the moral is that I shouldn't judge males based on their equipment.

Me: Yes but do you get why this happens? If you take some guys who all have dicks of equal length, you will have some kids and some adults. But to have a little kid with a penis as long as an adult, you need the kid to be on a boner but not the adult, and so this correlation comes about.

Female: Ok. You gifted me your pearl of scientific wisdom. Yet, following this line of reasoning, I still don't see why should I change door.

Me: Well, so. Both erection and age have a positive effect on dicklength, more erection more age more dick, and the result is an anticorrelation. Conversely, the initial door taken and the winning door both have a negative effect on the suregoat door, because Monty must avoid them both. So, in the second case too, we have an anticorrelation (between first choice and prize), because two minus signs make a plus. If you are confused by this thing about signs, think from the start using "negerection" and "negage."

Female: Aha.

I hope to have debored you enough and that from now on you will remember what these vagina diagrams are about. Their actual boring name is “causal colliders,” by the way, because of the arrows “colliding” in the central variable.

But this is only the beginning! Because Pearl’s point is more subtle: the paradoxiness  depends on the direction of the arrows. “Spurious” correlations happen all the time without you getting confused about what’s the true relationship of cause and effect. Probably you have already heard common examples like “correlation is not causation, because if you find out that the price of beans in China is correlated with the price of fuel at the station, it doesn’t mean that a shopkeeper in Beijing can make you pay more for a tankful by raising his prices, it’s the global market trend which is the common cause that makes them correlated.” However, for completeness’ sake, I will provide yet another example just for my dear reader.

Suppose that the Distinguished Quacky B. Quackson High Quack Chair Professor of Applied Quacking at McQuack University is running a study to prove that their new Quackopatic treatment for anxiety works. Also, suppose he is at odds with Fisher (easy call) so he won’t use Fisher’s randomized controlled trial (RCT) technique with a control group. He designs the study in the following way: he takes in people with self-declared anxiety problems. Since a lot more women answer the call, he stratifies the sampling by imposing the same number of men and women, to do a balanced study on both sexes. He doses the drug proportionally to body weight. A week after treatment, he has subjects fill a questionnaire on anxious behaviors and—success! There is a very strong negative correlation between self-reported anxiety and the amount of medicine administered. You know the full story because I’m kind, he just reports the result as “we observed a very strong negative correlation between medication and target, pointing without doubt to the effect of the treatment” omitting all the other fussy details. Now tell me: why shouldn’t you place too much trust in Prof. Quackson’s words? Do you see a reason why the correlation is not meaningful?

…

…

…

Don’t look at the solution yet! Think!

…

…

…

And don’t you dare find one of those other zillion reasons for not trusting Prof. Quackson’s study which have nothing to do with the point!

…

…

…

Done? The solution is: the sample of women is more anxious than the sample of men. And he is giving more Quacksulveforax (that was the name) to male subjects because they weigh more. So the correlation is just the prior sex-anxiety correlation, he would observe it even before the treatment.

I expect that you either have figured out the solution yourself, or at least think that the solution makes sense. Actually, I hope that you are already thinking about how to fix the study. It would be sufficient, say, to compute the correlation separately for males and females. Or to measure the difference in anxiety pre- and post-treatment. Or have a control group. I expect that how you feel about this stuff is of course it doesn’t work! Just do the study in the right way!

While, instead, I expect you to feel perplexed about switching door or trusting your assistant not to have cherry-picked young subjects for the penis experiment. What’s the difference in trying to see through the veil of the correlation between these two kinds of situations? Pearl’s answer (to everything, actually) is: just draw the graph!

The arrows go in the opposite direction! It is easy for us to understand the correlation when it is produced by a shared cause of multiple effects, while it is difficult to have an intuitive grasp when there’s a single effect of multiple causes.

I don’t feel sure about this explanation, because there are cases where we are very quick at reasoning in the correct way even with colliders. Someone depleted the secret stash of chocolate. Was it little Anny or little Benny or little Chenny or…? If you find sure proof that Anny ate the chocolate, how much time do you lose trying to check if also Benny, Chenny, Danny, etc. took part in the misdeed?