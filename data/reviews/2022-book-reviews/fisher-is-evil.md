---
title: "Fisher is Evil"
author: "Unknown"
reviewAuthor: "Anonymous"
contestId: "2022-book-reviews"
contestName: "2022 Book Reviews"
year: 2022
publishedDate: "2026-02-06T07:22:32.818Z"
slug: "fisher-is-evil"
wordCount: 3059
readingTimeMinutes: 14
originalUrl: "https://docs.google.com/document/d/100kMdSVFviZSSBvUyyEQPMNlvLptVQxHFD9i9wGuBWs"
source: "gdoc"
---

A young Fisher. ([Source](https://www.google.com/url?q=https://commons.wikimedia.org/wiki/File:Ronald_Fisher_as_a_child.JPG&sa=D&source=editors&ust=1770366145319311&usg=AOvVaw3tLTTQpnS8YAs68JSXuUwY))

If you have ever read Jaynes’ book on Bayesian statistics, you may remember that R. A. Fisher, one of the fathers of what we now call orthodox statistics, often pops up as the villain of the situation. Jaynes is always dutifully respectful of Fisher’s accomplishments and technical competence, but I will venture to say that, between the lines, he is painting the figure of a shithead. He even underlines how Fisher had no sense of humor at all and would explode in rage at the minimum involuntary provocation, while his Bayesian counterpart—the distinguished Sir Harold Jeffreys [2]—was a very funny and nice old man who chatted amicably with his friends, making fun of Fisher. Also, he indicates that Fisher was an eugenist, although I could not sense if, in the view of the writer, that counted as an obvious negative due to its association with Nazi ideology, or if it was just meant as a statement of fact with no connotation.

Early in the book, Pearl too starts by pointing out Fisher’s bad character, in relation to the limited success of an early theory of causation by Wright, called “path analysis”, which in hindsight forms the basis of the one invented by Pearl decades later.

Although Crow did not mention it, Wright’s biographer William Provine points out another factor that may have affected the lack of support for path analysis. From the mid-1930s onward, Fisher considered Wright his enemy. I previously quoted Yule on how relations with Pearson became strained if you disagreed with him and impossible if you criticized him. Exactly the same thing could be said about Fisher. The latter carried out nasty feuds with anyone he disagreed with, including Pearson, Pearson’s son Egon, Jerzy Neyman (more will be said on these two in Chapter 8), and of course Wright.

And here’s from chapter 8:

In 1935, Neyman gave a lecture at the Royal Statistical Society titled “Statistical Problems in Agricultural Experimentation,” in which he called into question some of Fisher’s own methods and also, incidentally, discussed the idea of potential outcomes. After Neyman was done, Fisher stood up and told the society that “he had hoped that Dr. Neyman’s paper would be on a subject with which the author was fully acquainted.”

“[Neyman had] asserted that Fisher was wrong,” wrote Oscar Kempthorne years later about the incident. “This was an unforgivable offense—Fisher was never wrong and indeed the suggestion that he might be was treated by him as a deadly assault. Anyone who did not accept Fisher’s writing as the God-given truth was at best stupid and at worst evil.” Neyman and Pearson saw the extent of Fisher’s fury a few days later, when they went to the department in the evening and found Neyman’s wooden models, with which he had illustrated his lecture, strewn all over the floor. They concluded that only Fisher could have been responsible for the wreckage.

But most importantly, like Jaynes, Pearl dedicates an entire chapter to a topic where arguably Fisher plays the role of protagonist. It narrates the story of how it was discovered that smoking causes lung cancer. I have systematically been exposed to anti-smoking propaganda since childhood. At school they would periodically explain to us how bad smoke was using a lot of fancy diagrams of the human body. However, nobody ever bothered to quantify the seriousness of the danger. Consequently, I always presumed that it was a true but somewhat small statistical effect that was not trivial to see and as such it was important to convince people of its existence. Well, it turns out that, by modern standards, the effect had been farcically easy to notice the first time:

Before cigarettes, lung cancer had been so rare that a doctor might encounter it only once in a lifetime of practice. But between 1900 and 1950, the formerly rare disease quadrupled in frequency, and by 1960 it would become the most common form of cancer among men. Such a huge change in the incidence of a lethal disease begged for an explanation.

[...]

Of course Hill knew that an RCT was impossible in this case, but he had learned the advantages of comparing a treatment group to a control group. So he proposed to compare patients who had already been diagnosed with cancer to a control group of healthy volunteers. Each group’s members were interviewed on their past behaviors and medical histories. To avoid bias, the interviewers were not told who had cancer and who was a control.

The results of the study were shocking: out of 649 lung cancer patients interviewed, all but two had been smokers.

[...]

Doll and Hill realized that if there were hidden biases in the case-control studies, mere replication would not overcome them. Thus, in 1951 they began a prospective study, for which they sent out questionnaires to 60,000 British physicians about their smoking habits and followed them forward in time. (The American Cancer Society launched a similar and larger study around the same time.) Even in just five years, some dramatic differences emerged. Heavy smokers had a death rate from lung cancer twenty-four times that of nonsmokers. In the American Cancer Society study, the results were even grimmer: smokers died from lung cancer twenty-nine times more often than nonsmokers, and heavy smokers died ninety times more often. On the other hand, people who had smoked and then stopped reduced their risk by a factor of two.

What was the role of Fisher in this? He was the most famous statistician on Earth. He was a habitual smoker. And he thought that everyone else was dumb and he was always correct.

As the first results showing a connection between smoking and lung cancer appeared, [Fisher stated](https://www.google.com/url?q=https://www.york.ac.uk/depts/maths/histstat/smoking.htm&sa=D&source=editors&ust=1770366145325806&usg=AOvVaw2hW_q4ab7A0e8eSSrQypSh) that the correlation was due to an unknown hereditary factor that caused both smoke craving and increased lung cancer risk. His opinion was probably shaped by his quantitative studies of evolution and his eugenic views; he was used to attribute more importance to genes than other people thought they carried.

Due to previous historical developments (discussed elsewhere in the book) orthodox statisticians had never introduced a clear concept of causation, concentrating only on correlations. Thus, when Fisher insisted on his hypothesis, no one had a statistical tool ready to throw at the data to prove him wrong. Even when the data showed that the connection was so strong that it provably could not be only due to an unobserved confounder, he stuck stubbornly with his idea. [The argument](https://www.google.com/url?q=https://academic.oup.com/ije/article/38/5/1175/666926?login%3Dfalse&sa=D&source=editors&ust=1770366145326762&usg=AOvVaw0fm7Tk9oBIzfiYSqQOAvKe) that sealed the presence of a causal connection goes as follows:

Cornfield took direct aim at Fisher’s constitutional hypothesis, and he did so on Fisher’s own turf: mathematics. Suppose, he argued, that there is a confounding factor, such as a smoking gene, that completely accounts for the cancer risk of smokers. If smokers have nine times the risk of developing lung cancer, the confounding factor needs to be at least nine times more common in smokers to explain the difference in risk. Think of what this means. If 11 percent of nonsmokers have the “smoking gene,” then 99 percent of the smokers would have to have it. And if even 12 percent of nonsmokers happen to have the cancer gene, then it becomes mathematically impossible for the cancer gene to account fully for the association between smoking and cancer. To biologists, this argument, called Cornfield’s inequality, reduced Fisher’s constitutional hypothesis to smoking ruins. It is inconceivable that a genetic variation could be so tightly linked to something as complex and unpredictable as a person’s choice to smoke.

This was not at all clear to me on first reading, so I made a diagram:

The two bars represent non-smokers and smokers. I arbitrarily filled two ticks of the non-smokers with cancer (red), and two ticks with the cancer-smoke-gene (black), with one tick of non-smokers having both cancer and the gene.

Since smokers have nine times the risk of getting cancer, I have to fill 2 x 9 = 18 ticks with red in the smokers bar. How many ticks should be filled with black? First, if it’s only the gene which is causing the increase in cancer risk, all additional red ticks compared to the non-smokers must also be filled with black, so I filled with black the 16 ticks from 3rd to 18th. Second, within the people who have the gene, the fraction of cancer must stay the same: otherwise being a smoker would have an additional effect on cancer not explained by the gene. In the non-smokers bar there is one red tick out of two black ones, a proportion of 1:2, while in the smokers bar there are already 17 red-black ticks, so I have to add another 17 black-only ticks.

This shows that the fraction of smokers who have the gene must be at least nine times the fraction of non-smokers who have it, which is the first part of the reasoning. Then it follows that the fraction of non-smokers with the gene is less than 1/9, otherwise more than 100 % of the smokers would have it. The argument concludes by stating that of course it is very unlikely that just 1/9 = 11 % of the non-smokers have the gene, there must be more, and so the premise (only the gene is having an effect on cancer) is false.

I’m no biologist, so I did not understand why there could not be less than 11 % non-smokers with the gene. I asked a biology student, he said “Muh I don’t know.” I asked a statistics student, she said “Uh well you just get used to a certain magnitude of genetic effects after seeing many of them and this seems too strong.” To this I objected: but there exists also genetic (or innate anyway) stuff that has a strong effect on everything, right? For example, if you are born with an additional X chromosome, you are more at risk of doing all sorts of weird stuff like throwing away clothes because they have holes, hanging up little icons of Jesus, spreading dangerous chemicals on domestic surfaces, etc. Or if you are born intelligent, you will fare better than other people at school without breaking a sweat and also have fun while doing it and get a higher salary without moral compromises and physical labor. In fact, X-X humans do smoke less and live longer and are better at school than X-Ys. The same goes for intelligent people. So how can an innate factor be excluded here?

 

I think the explanation is “implicit deconfounding.” Gender does have a strong effect on death and smoking. However, it is not a problematic confounder, because it is very easy to know the gender of people [citation needed]. So, even if you don’t mention it, of course if the gender effect was relevant to the matter at hand you would have noticed and adjusted for it. Remember that the final goal of this kind of discussion is prediction: if medical science was so advanced that you could tell beforehand if you are the kind of guy who would stay healthy even in the face of smoking, nobody would care about the average causal effect of smoke on cancer in the population, the thing would stop being statistical (well, let’s say “become less statistical”) and you would ask your doctor if you in particular can smoke or not because, doctor, I really like getting high on marginal cancer risk.

This applies to genetic/innate factors in general in the following way: it is true that we have examples of very strong and influential factors, and not just weak ones. But strong factors tend to have an effect on everything, not just a single habit and a single medical outcome, in such a way that you already know of those factors beforehand and they never qualify as confounders. It is interesting that indeed there is a genetic effect matching Fisher’s hypothesis:

Ironically, genomics researchers discovered in 2008 that Fisher was right: there is a “smoking gene” that operates exactly in the way he suggested.

However:

The discovery of the smoking gene should not change anybody’s mind about the overwhelmingly more important causal factor in lung cancer, which is smoking. We know that smoking is associated with more than a tenfold increase in the risk of contracting lung cancer. By comparison, even a double dose of the smoking gene less than doubles your risk. This is serious business, no doubt, but it does not compare to the danger you face (for no good reason) if you are a regular smoker.

So in hindsight it was reasonable to expect the presence of an innate common cause, but it was also reasonable to expect that it could not be big enough to explain all the observed effect without having been noticed already.

Far atop these paragraphs it is clickbaited: Fisher is evil. Let us flesh this out in more exquisite detail. Pearl and Mackenzie say:

The case of Fisher is particularly sad. Of course, skepticism has its place. Statisticians are paid to be skeptics; they are the conscience of science. But there is a difference between reasonable and unreasonable skepticism. Fisher crossed that line and then some. Always unable to admit his own mistakes, and surely influenced by his lifetime pipe-smoking habit, he could not acknowledge that the tide of evidence had turned against him. His arguments became desperate. He seized on one counterintuitive result in Doll and Hill’s first paper—the finding (which barely reached the level of statistical significance) that lung cancer patients described themselves as inhalers less often than the controls—and would not let it go. None of the subsequent studies found any such effect. Although Fisher knew as well as anybody that “statistically significant” results sometimes fail to be replicated, he resorted to mockery. He argued that their study had showed that inhaling cigarette smoke might be beneficial and called for further research on this “extremely important point.” Perhaps the only positive thing we can say about Fisher’s role in the debate is that it is very unlikely that tobacco money corrupted him in any way. His own obstinacy was sufficient.

(Note: the part on “tobacco money” does not mean he was not paid by big tobacco, it means he was paid but only because he was already a supporter and would have been in any case.)

So, well, I don’t think Fisher is “evil” as, like, the idealized evil dictator of eviland. It’s his unfortunate circumstance that’s evil! Fisher is not evil, he is, let’s say, the rationalist nightmare. He’s a sort of genius, brilliant at math, always the smart guy in the room. From his point of view all the dumbwits around him are making mistakes at each turn so he invents a new statistical language which limits by construction answerable questions to objective ones and constrains other people to only use methods designed and vetted by a caste of trained statisticians led by him such that nobody can ever make mistakes or try to ask subjective questions, problem solved.

(Spoiler: it ends with people just being confused and misusing the language to prove any bullshit, folks there are no true Scotsmans here to see, it’s just unfounded rumors, please return to your homes.)

Then, from the evident fact that everyone else is dumber than him, he’s ready to see that innate intelligence and ability are extremely important factors, he sets out to do something concrete about this and studies how to systematically improve the intelligence of people for the benefit of mankind (eugenics).

(Spoiler: it ends with people applying eugenics as “So I’ve measured that the elliptical eccentricity of the craniums of this group of Africans is 0.02 less than that observed on my friends, which necessarily implies negroes are designed by God to be slaves, so let’s kill all Jews!”)

Then a new group of dumbsters pops up saying that his favorite drug, which has clearly no side effects and helps him concentrate, which surely is a benefit to humankind since this enables his intellect to run at top speed and produce more scientific breakthroughs, causes cancer. WTF causality is an illusion simpletons, even babies know that nowadays, and of course you want a scapegoat for your inferior genes. Now tell me, a literal additional chromosome can cause you to have a literally bloody hole between your legs or to be literally diagnosed with dumbness, and now oh yes these people we have found who can’t avoid drugs and have cancer can’t be a genetic effect woooo man it’s tooooo complicated to be a genetic effect.

(Spoiler: it ends with people thinking that maybe inhaling burned stuff is not so bad and it gets soft-banned very slowly causing—yes, causing indeed—millions of additional easily preventable deaths.)

So, now I ask you: what would you have done in Fisher’s shoes? Like, Fisher almost nailed everything, just, in a sort of everything goes wrong in practice way. What thought process could have brought you away from a mental state in which all the pieces of reality feel so connected?

Maybe you could have solved it with expected utility: from your point of view you feel quite sure about the genetic explanation, but if it turns out smoking is bad, and in the meantime we have not stopped it, the outcome is a pile of bodies! So we stop smoking while we figure out the situation, we can always light back our pipes later. But this works poorly in practice due to Pascal’s milking: what if the loss of quality of life of people who like smoking balances the additional deaths? What if Fisher can’t concentrate and find a breakthrough that brings to important discoveries in all fields through a new statistical analysis method? What if God exists and thinks YOU SHALL SMOKE? What if racism is so bad that any second you dedicate to stopping smoke is wasted and should have been dedicated to fighting racism instead so you should stop thinking about this right now? What if Pascal comes back from the dead because zombies and eats your face? How can you smoke without a face?

Yes I’m a whig historian so what?? Pearl is, too.

An old Fisher smoking his loyal pipe. In a few years he will die of cancer. [1] ([Source](https://www.google.com/url?q=http://www.economics.soton.ac.uk/staff/aldrich/fisherguide/rafreader.htm&sa=D&source=editors&ust=1770366145341021&usg=AOvVaw3l7M5FrlmLYm26PKqORRHO))