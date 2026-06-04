---
title: The Science of Second Chances
author: Unknown
reviewAuthor: Anonymous
contestId: 2026-book-reviews
contestName: 2026 Book Reviews
year: 2026
publishedDate: '2026-05-21T02:08:06.000Z'
slug: the-science-of-second-chances
wordCount: 7915
readingTimeMinutes: 36
source: gdoc
tags:
  - Politics
  - Economics
  - Society
---

International comparisons are not kind to the United States criminal justice system. The United States has both higher rates of [homicide](https://data.worldbank.org/indicator/VC.IHR.PSRC.P5?locations=OE) and higher rates of [incarceration](https://www.prisonstudies.org/world-prison-data/highest-lowest/highest-lowest-prison-population-rate) relative to its peer nations.[^1] To make matters worse, roughly [a third](https://asc41.org/wp-content/uploads/ASC-Criminologist-2025-03.pdf) of those released from prison in the United States are re-incarcerated in the years that follow, leading them right back into the throes of the criminal justice system.

In “The Science of Second Chances”, economist Jennifer Doleac is interested in the question of how to break this vicious cycle of criminality and punishment. She wishes to understand both _when_ it makes sense to give criminal offenders a second chance to create a better life for themselves, and more generally, _how_ to create second chances for would-be victims and perpetrators of crime by preventing crimes from happening in the first place.

I will say upfront that this is no easy task. Even at a time when crime levels have reached historic lows, public sentiment about crime [remains](https://counciloncj.org/perception-and-reality-understanding-crime-concerns-in-the-united-states/) fairly negative.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/6aee58365014bee9.png)

<figcaption>

_Figure 1 of Lopez and Graham (2026). In purple, the percent of respondents in the Gallup Social Survey who answered that there is more crime in the United States than there was a year ago. In light blue, the total crime rate per 100,000 residents obtained from the FBI’s Uniform Crime Report._

</figcaption>

</figure>

Accordingly, policymakers and the constituents they represent will need strong assurances - what we in the blogosphere might like to call Killer Arguments™ - to be convinced that investing in second chances is worth it. Fortunately, Doleac is well-equipped for the task.

Drawing on her experience as an applied economist and leader within the policy-oriented philanthropy Arnold Ventures, Doleac assembles a vast array of research to argue that criminal justice reform is possible in a way that both enhances public safety and humanizes those within the criminal justice system itself. Though I do not endorse every empirical point made in the book, Doleac’s humble approach towards policy evaluation and extensive knowledge of the criminal justice system make this book a delightful read. For readers interested in understanding what works to reduce crime and recidivism, I highly recommend giving “The Science of Second Chances” a shot.

## Natural Experiments

A central obstacle to understanding what works to improve the criminal justice system is _selection bias_. Prisoners who sign up for rehabilitative programming are more motivated to reform themselves than prisoners who don’t. People who are convicted of a crime are more prone to recidivism than people who are merely arrested and released. And people sentenced to electronic monitoring are less hardened criminals than those sentenced to prison - you get the point.

Doleac laments that much of the research that fuels thinking in the criminal justice policy space is littered with research that fails to deal with this problem.

> For too long, researchers have produced weak studies that don’t measure causal effects, and stakeholders have unknowingly accepted that evidence as the basis for reform. No wonder we’re still struggling with the same problems we’ve had for decades.

In theory, policymakers could deal with this problem by way of randomized experiments: randomly assign individuals to different interventions and follow their outcomes over time. In the setting of the criminal justice system, it’s a bit like the way the Batman villain [Two-Face](https://villains.fandom.com/wiki/Two-Face_(DC)) decides what punishment to administer to his targets. Heads, you get incarcerated. Tails, you don’t. The random assignment of the intervention ensures that our intervention group and control group are comparable at baseline and any subsequent differences that emerge should be due to the intervention itself.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/b4adc060735f4d65.png)

<figcaption>

_A hypothetical randomized experiment which estimates the effect of incarceration relative to probation._

</figcaption>

</figure>

The problem, however, is that, while such randomized experiments can and do exist in the criminal justice world, they are quite rare. To understand what interventions are effective in reducing crime, then, Doleac argues that we should also consider an alternative form of evidence: _the natural experiment_. Natural experiments form the heart and soul of “The Science of Second Chances” and come in three primary forms.

In a **regression discontinuity experiment,** the policy intervention in question is administered right above a certain cutoff. For example, a stricter penalty for substance abuse might kick in for all individuals convicted right after a certain date. When the cutoff in question is arbitrary (i.e. it is not correlated with the outcome of interest due to factors other than the policy in question), the causal effect of the policy intervention can be calculated by comparing the outcomes of those individuals just below the cutoff to the outcomes of those right above it.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/7e42d8957b67fd9e.png)

<figcaption>

_A hypothetical regression discontinuity experiment where a policy is implemented immediately after a particular date, leading to an immediate increase in the outcome of interest._

</figcaption>

</figure>

In a **decision-maker experiment**, the policy intervention in question is administered based on a decision made by a pre-assigned authority such as a judge, attorney, or parole officer. For example, two individuals convicted of the same crime might be assigned to judges with different likelihoods of sentencing them to time in prison. When the process of being assigned to a decision-maker is random and the decision-maker only affects the outcome of interest via that decision, the causal effect of the policy intervention can be calculated by comparing the outcomes of those individuals assigned to different decision-makers. To use the Two-Face analogy again, it’s a bit like saying, “Head, you get assigned to a judge who has a 40% chance of incarcerating you. Tails, you get assigned to a judge who has a 60% chance.”

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/29ae100250641354.png)

<figcaption>

_A hypothetical decision-maker experiment where an individual is randomly assigned to a lenient judge or a strict judge._

</figcaption>

</figure>

And in a **difference-in-differences experiment**, the policy intervention in question is administered to a particular group of individuals at a specific point in time while being withheld from another comparable group at the same time. For example, a group of counties might choose to crack down on public intoxication while a neighboring group of counties chooses not to. When the outcomes in both groups would have trended in parallel over time in the absence of the intervention, the causal effect of the policy intervention can be calculated by estimating the difference between the affected and unaffected groups _after_ the policy has kicked in, estimating the same difference _before_ the policy has kicked in, and taking the difference _between_ those differences.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/ac862807e35420eb.png)

<figcaption>

_A hypothetical difference-in-differences experiment where County A implements a policy but County B does not. The causal effect of the policy is the post-policy difference in the outcome minus the pre-policy difference in the outcome._

</figcaption>

</figure>

Importantly, _none_ of these methods are a free lunch. They are more vulnerable to [p-hacking](https://conference.iza.org/conference_files/JuniorSenior_2019/brodeur_a7631.pdf), [less statistically](https://blogs.worldbank.org/en/impactevaluations/power-calculations-regression-discontinuity-evaluations-part-1) [precise](https://engineering.atspotify.com/2023/08/encouragement-designs-and-instrumental-variables-for-a-b-testing), and [more](https://www.princeton.edu/~davidlee/wp/RDDEconomics.pdf) [assumption-laden](https://www.ericchyn.com/files/CFL_2025_Examiner_Designs.pdf) than randomized experiments. For this reason, such methods are often called _quasi_-experiments (i.e. not true experiments).

As we shall see, however, Doleac makes a mostly convincing case that natural experiments are valuable complements to randomized experiments as a means of identifying interventions that work to create second chances in the criminal justice system. So naturally that raises the question: what exactly are these interventions that “work”? The book discusses many examples, but for the sake of brevity, I’ll cover three: leniency for first-time non-violent offenders, increasing the certainty of punishment, and cognitive behavioral therapy.

## Leniency For First-Time Non-Violent Offenders

In the United States, non-violent criminal activity results in around [6 million arrests](https://counciloncj.org/who-gets-arrested-in-america-trends-across-four-decades-1980-2024/) each year. On the one hand, allowing such activity to go unpunished would be a recipe for disaster. Non-violent crimes like shoplifting [have](https://www.noahpinion.blog/p/why-shoplifting-is-bad) real consequences! On the other hand, Doleac points out that imposing too strict a punishment for such crimes might have unintended consequences.

> A criminal record makes it more difficult to find a job … This creates economic hardship that can make criminal behavior more likely, as a way to make ends meet. A criminal record also makes it more difficult to find housing, as most landlords run background checks just like employers do. Without a safe place to live, you might find yourself in more dangerous situations, with less to lose, and more vulnerable to future charges for offenses such as trespassing when you have nowhere to go.

These considerations naturally raise the question: _what is the appropriate level of punishment for non-violent crimes?_

While the answer to this question naturally depends on one’s philosophical commitments, Doleac argues that, if we are purely thinking in terms of public safety, not only do we have room to be more lenient, improving public safety might actually _require_ us to embrace greater leniency in certain cases. She draws on two studies to support this claim, both of which I’ll cover here.

## Case Study #1: Misdemeanor Prosecution in Massachusetts

In Massachusetts, attorneys have discretion over whether to prosecute non-violent misdemeanor crimes. Some attorneys are generally more stringent and err on the side of prosecution while others are more lenient and err on the side of non-prosecution. Because cases are randomly assigned to attorneys within a given court and time period, a team of economists (including Doleac) were able to estimate the causal effect of non-prosecution on subsequent criminal activity using a decision-maker experiment.

The results from this natural experiment were jaw-dropping to say the least. For first-time offenders, non-prosecution [decreased](https://econ.wisc.edu/wp-content/uploads/sites/89/2022/02/ADH_MisdemeanorProsecution_Apr21.pdf) the chances of generating a new criminal complaint by **30 percentage points**! In other words, for the 10% of non-violent misdemeanor cases where attorneys meaningfully varied in their prosecution tendencies, prosecution ended up _hurting_ public safety more than helping it.

When I initially encountered this finding in “The Science of Second Chances”, I thought it might be a fluke. Isn’t it rather convenient that _not_ prosecuting someone for committing a crime would be associated with a statistical _reduction_ in their propensity to commit a new crime? However, in attempting to throw water on the finding, I only encountered additional support for it. Decision-maker experiments in [Ohio](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4777635) and [Virginia](https://aouss.github.io/RevolvingDoor.pdf) have since reached similar conclusions as the original Massachusetts study. Thus, what causal evidence we do have on the effects of misdemeanor prosecution is fairly unanimous. To use Doleac’s words:

> Erring toward leniency, particularly for first-time [non-violent misdemeanor] defendants made everyone better off.

## Case Study #2: Felony Diversion in Houston, TX

The second leniency case study Doleac discusses comes from a felony diversion program in Houston, Texas. In Houston, individuals charged with a first-time non-violent felony can avoid being formally convicted by pleading guilty and enrolling in a diversion program. Though the exact requirements of the program vary based on the defendant’s characteristics, common components include community service, substance abuse treatment, and of course, a requirement not to commit any new offenses.

Now here’s the interesting part. In 1994, Houston implemented a law that reduced the attractiveness of felony diversion to prosecutors, causing an immediate 24 percentage point _drop_ in diversion rates for first-time non-violent felons. And 13 years later, the same city narrowly passed a ballot referendum to veto the construction of a new prison facility, causing an immediate 18 percentage point _spike_ in diversion rates for first-time non-violent felons.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/c15de8bbc4076e4e.png)

<figcaption>

_Figure 2 of Mueller-Smith and Schnepel (2020). The percentage of first-time non-violent felony charges being diverted around the 1994 and 2007 policy changes._

</figcaption>

</figure>

Because the composition of first-time non-violent felons did not change around either policy date, a group of researchers were able to compare the recidivism outcomes of felony offenders charged just before and just after the policy changes to estimate the causal effect of felony diversion (i.e. a regression discontinuity experiment).

This comparison ultimately [revealed](https://kschnepel.github.io/files/Diversion.pdf) that felony diversion was effective in reducing recidivism!

* In 1994 (when diversion rates dropped), 10-year recidivism levels increased. First-time felons charged just _after_ the new policy was passed incurred **0.27 more criminal convictions** in the subsequent 10 years relative to felons charged just _before_.
* In 2007 (when diversion rates increased), 10-year recidivism levels dropped. First-time felons charged just _after_ the referendum incurred **0.24 less criminal convictions** in the subsequent 10 years relative to felons charged just _before_.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/bb70eeaa1dd8e183.png)

<figcaption>

_Figure 2 of Mueller-Smith and Schnepel (2020). The number of future criminal convictions incurred by non-violent felony defendants who were charged around the 1994 and 2007 policy changes. Future convictions are measured using a 10-year follow-up period._

</figcaption>

</figure>

What’s more is that these effects _under-state_ the impact of felony diversion on recidivism. When the authors use [some fancier statistical methods](https://mixtape.scunning.com/06-regression_discontinuity#the-fuzzy-rd-design) to analyze the set of felons who actually received diversion as a result of the policy changes in question, the estimated recidivism reductions are a whopping **45%** in magnitude and highly significant.

So once again, Doleac’s “less is more” philosophy towards first-time non-violent crime is on solid ground. With not one, but two natural experiments, and results that clearly pass the good ol’ eye-ball test (among a litany of other important robustness tests), we can confidently say that a second chance helps place first-time non-violent felons on a better path.

## Increasing the Certainty of Punishment

Conversations about criminal justice policy are often dominated by debates about the severity of punishment. And in fairness, the previous case studies make clear that such debates are pretty important to have. A key theme in “The Science of Second Chances”, however, is that a sole focus on the severity of punishment ignores what is arguably an _even more_ important determinant of its efficacy: namely, its certainty!

Doleac offers two reasons why we might expect increasing the certainty of punishment to be more effective in reducing crime than increasing its severity.

1. **Criminals largely think in terms of the present.** Long prison sentences will not deter many criminals from committing a crime if most are not really thinking hard about their long-term prospects to begin with. Increasing the odds of punishment soon after committing a crime, however, might get them to think twice.
2. **Crime is a young man’s game.** Long prison sentences have a diminishing return over time because criminals are naturally less likely to recidivate as they grow older. Policies which increase punishment certainty, on the other hand, operate largely independently of age.

Of course, these reasons are really just speculation in the absence of hard data to back them up. So what “hard data” does Doleac bring to the table to show that increasing the certainty of punishment is an effective way to reduce crime? The book draws on multiple natural experiments to take on this challenge, two of which I’ll cover here.

## Case Study #1: DNA Databases

In April 2005, Denmark passed a law which greatly increased usage of the Danish Central DNA database in response to criminal activity. In March 2005, only 4% of individuals charged with a crime were entered into the database. By October of the same year, that share [rose](https://jenniferdoleac.com/wp-content/uploads/2015/03/DNA_Denmark.pdf) to 40%.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/fff3ade5f7a865ad.png)

<figcaption>

Figure 1a of Anker, Doleac, and Landersø (2017). The share of offenders who are registered in the DNA database by month of charge. The red line denotes the time that the Danish law passed.

</figcaption>

</figure>

Because neither the volume nor composition of individuals charged with a crime changed during the same time period, a team of economists (once again including Doleac) were able to estimate the causal effect of the database expansion on recidivism using a regression discontinuity-like experiment. The results of this exercise, per Doleac, represent a strong confirmation of the “certainty of punishment” thesis:

> Adding anyone charged with a felony to the law enforcement DNA database in Denmark reduced future criminal convictions by over **40 percent**. [In other words], people responded to the higher probability of getting caught by committing fewer crimes.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/3a408877ef78a4e0.png)

<figcaption>

Figure 3b of Anker, Doleac, and Landersø (2017). The excess number of criminal convictions for “fast” charges an individual goes on to receive in the next year by month of charge. The red line denotes the time that the Danish law passed.

</figcaption>

</figure>

At an initial glance, this claim seems quite confusing. If DNA databases were helping Danish authorities identify perpetrators of criminal activity, shouldn’t we have expected criminal convictions to _increase_ as a result of the database expansion? Why would a reduction in criminal convictions be taken as evidence that DNA databases were working as intended?

The answer to this question lies in a detail of the study that Doleac understandably skips over in the book because it’s fairly complicated to explain … so naturally, I’m going to try and explain it here.

Note that a key challenge with using criminal convictions to estimate the causal effect of DNA databases on crime is that they can be simultaneously impacted by DNA databases in opposing directions. Adding someone to a DNA database can _deter_ them from committing new crimes, thereby _reducing_ their chances of future criminal conviction. Or it can help _detect_ crimes that person commits, thereby _increasing_ their chances of future criminal conviction.

To isolate the deterrence effect from the detection effect, Doleac and her co-authors specifically analyze criminal convictions for so-called “fast” charges. They write:

>   
> In constructing the outcome variables, we distinguish between convictions for which the charge occurred three weeks or less after the crime date, and convictions for which the charge occurred more than three weeks after the crime date. This is done in an attempt to separate the charges where prior DNA profiling is unlikely and likely, respectively, to have contributed to the identification of the offender. Because the analysis of crime scene evidence takes some time, it is not possible that a match in the DNA database led police to the offender if he was charged very soon after the crime. Any effect of DNA profiling on observed recidivism during that window would come solely from a deterrence effect.

Thus, when Doleac claims that DNA database expansion “reduced future criminal convictions by over 40 percent”, she is not strictly making a claim about all convictions. Future criminal convictions for “slow” charges did not actually change before and after the 2005 database expansion. She is instead making a claim about the _subset_ of criminal convictions which she and her co-authors believe could only be impacted by DNA databases via a deterrence mechanism.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/eb08f1f2e555680f.png)

<figcaption>

Figures 3b-c of Anker, Doleac, and Landersø (2017). The excess number of criminal convictions for “fast” and “slow” charges an individual goes on to receive in the next year by month of charge. The red line denotes the time that the Danish law passed.

</figcaption>

</figure>

Admittedly, I don’t _totally_ buy this argument. While I am no expert on the Danish criminal justice system, my sense is that, even if DNA evidence cannot be used to secure a “fast” charge, it could still be used to convict an individual accused of such a charge (i.e. DNA evidence could still be used in court proceedings after the charge has been made). A better way to tease apart the deterrence vs detection effect would be to look at criminal charges directly.

Interestingly enough, the study also conducts this analysis and the results are … less decisive. DNA databases continue to be associated with fewer “fast” criminal charges, but this reduction is no longer highly significant. So my sense from looking at the study in more detail is that the general direction of Doleac’s claim in the book is probably real, but the exact magnitude is up for debate.

Perhaps what I find more intriguing than the details of the study itself, though, is the relationship its results bear to Scott Alexander’s “society is fixed, biology is mutable” [thesis](https://www.slatestarcodexabridged.com/Society-Is-Fixed-Biology-Is-Mutable.pdf). Using drug abuse as a motivating example, Alexander writes:

> Society is really hard to change. We figured drug use was “just” a social problem, and it’s obvious how to solve social problems, so we gave kids nice little lessons in school about how you should Just Say No … And that is why, even to this day, nobody uses drugs.
>
> On the other hand, biology is gratifyingly easy to change. Sometimes it’s just giving people more iron supplements. But the best example is lead. Banning lead was probably kind of controversial at the time, but in the end some refineries probably had to change their refining process and some gas stations had to put up “UNLEADED” signs and then we were done. And crime dropped like fifty percent in a couple of decades – including many forms of drug abuse.

What is interesting about DNA databases is that they represent an inversion of this logic. It is precisely the _immutability_ of one’s biology (and the certainty of punishment that comes with it) that renders the social phenomenon of crime _mutable_ - a kind of gene-environment interaction!

## Case Study #2: 24/7 Sobriety

Another policy cited by Doleac as evidence that the certainty of punishment matters is _“24/7 Sobriety”_.

For some context, South Dakota during the early 2000’s was ravaged by a DUI problem. The state [reported](https://archive.legmt.gov/content/Committees/Interim/2009_2010/Law_and_Justice/Meeting_Documents/Apr2010/IBH%20Commentary%2024-7%20Program.pdf) one of the highest rates of adult drunk driving in the nation, and 14% of the state’s prison population was [incarcerated](https://atg.sd.gov/docs/AnalysisSD24.pdf) because of a DUI offense. These statistics deeply troubled the state attorney general Larry Long, and in response, Long developed _“24/7 Sobriety”_.

The operating philosophy of the program was quite simple. When a person was arrested for an alcohol-related offense (usually a DUI), rather than incarcerate them, they would be required to take a breathalyzer test twice-a-day at a local sheriff’s office for a given duration of time. Pass both tests and you would be able to go about your day as you pleased. Fail a test - or fail to show up for a test - and you would spend a couple days in the local jail. The underlying idea was that, if alcohol use was punishable with near-perfect certainty, participants would learn to refrain from excessive drinking and ultimately be set on a path to a more sober and stable life.

So did the program work? Doleac argues yes:

> Professors Greg Midgette, now at the University of Maryland, and Beau Kilmer of RAND used [the] gradual rollout [of 24/7 Sobriety] as a natural experiment: a defendant accused of a repeat DUI (the initial focus of the program) in a 24/7 Sobriety county would have a high chance of being put on this program, while a similar defendant accused of the same offense in a county where 24/7 Sobriety wasn’t yet available would not …
>
> [Using this approach], they [found](https://onlinelibrary.wiley.com/doi/10.1002/pam.22217) that 24/7 Sobriety had big, beneficial effects on behavior. Being put on this program reduced the likelihood of a new arrest or having probation revoked within the next twelve months by 14 percentage points (a 49 percent change relative to the comparison group average).

I was naturally skeptical, though, couldn’t this positive result be due to other contemporaneous policies designed to deal with drunk driving? Local governments often adopt multi-pronged approaches to deal with social problems, and at the time _24/7 Sobriety_ was implemented, South Dakota was [no exception](https://archive.legmt.gov/content/Committees/Interim/2009_2010/Law_and_Justice/Meeting_Documents/Apr2010/IBH%20Commentary%2024-7%20Program.pdf):

> In 2006, South Dakota repealed its implied consent law. Any person arrested for a DUI offense must provide a sample of their blood, breath or urine to law enforcement. No longer [would] a defendant [be] able to refuse to provide evidence of their intoxication. Law enforcement officers increased enforcement efforts through the use of checkpoints and saturation patrols. [And] South Dakota substantially revised required classes for DUI first offenders.  

Doleac does not directly address this possibility in the book, but as far as I can tell, it doesn’t seem likely.

1. **First, the introduction of** _**24/7 Sobriety**_ **to a county was** **[only associated](https://ajph.aphapublications.org/doi/full/10.2105/AJPH.2012.300989)** **with reduced rates of** _**repeat**_ **DUI offenses in that county.** First-time DUI offenses were unaffected. This result is very difficult to explain as an artifact of contemporaneous policy changes since such policy changes should have affected all DUI offenses, not just repeat ones.
2. **Second, participants in** _**24/7 Sobriety**_ **[showed up to and passed 99%](https://atg.sd.gov/docs/AnalysisSD24.pdf)** **of breathalyzer tests administered during the program.** Thus, we know for a fact that participants’ alcohol use was quite limited during the program.
3. **Third, as Doleac notes, subsequent evaluations of** _**24/7 Sobriety**_ **in** **[North Dakota](https://pmc.ncbi.nlm.nih.gov/articles/PMC8414695/)** **and** **[Montana](https://www.rand.org/pubs/working_papers/WR1083.html)** **have produced similar results as the original South Dakota study.**

Perhaps the bigger threat to the _24/7 Sobriety_ literature is its pattern of barely significant results. Of the four published evaluations of _24/7 Sobriety_, three report main results whose p-values lie just below the 5% significance threshold.[^2] While such a pattern is not necessarily disqualifying, it is [unlikely](https://www.the100.ci/2018/02/15/the-uncanny-mountain-p-values-between-01-and-10-are-still-a-problem/) to occur organically and often indicative of p-hacking.

For this reason, my take on _24/7 Sobriety_ ends up being slightly different from Doleac’s. Instead of viewing the program as a resounding endorsement of her “certainty of punishment” thesis, I’m more inclined to view it as a cost-efficiency play. You get an outcome that is, in the worst case, statistically indistinguishable from the effects of incarceration for what is ultimately a [fraction](https://archive.legmt.gov/content/Committees/Interim/2009_2010/Law_and_Justice/Meeting_Documents/Apr2010/IBH%20Commentary%2024-7%20Program.pdf) of the cost to taxpayers.

Separately, it is interesting to note that, like the DNA database example, _24/7 Sobriety_ enforces certainty of punishment via a biologically-mediated pathway. Just as residual DNA at a crime scene allows authorities to identify the perpetrator of said crime, residual alcohol in one’s bloodstream allows police officers to identify probationers who are not sober. It makes me wonder, what other advances in biotechnology could be used to assist crime-fighting? I do not know, but the success of these interventions seems like a good signal that we could use more interdisciplinary exploration here.

## Cognitive Behavioral Therapy

A common takeaway from the sections of the book we’ve reviewed thus far is that _incentives matter._ Burdening first-time non-violent offenders with a criminal record can incentivize them to commit additional crimes, not less. And adding felons to a DNA database incentivizes them to think twice before committing a crime that they could easily be linked back to.

A natural question I and many others might have, though, is: _are there ways to reduce crime that do not involve external manipulation of incentives?_ If would-be criminals could be convinced that engaging in pro-social behavior is good in and of itself (or at least, that engaging in anti-social behavior is bad in and of itself), it might be possible to produce reductions in recidivism even in environments where the balance of incentives to avoid committing crime has not actually changed.

The book’s answer to this question is cognitive behavioral therapy.

Full disclosure: I’m not a therapist. But the way I understand it, cognitive behavioral therapy, or CBT for short, is basically a way to help people frame their thoughts and behaviors in more constructive terms. For example, if someone bumps into you on the sidewalk, maybe it’s because they just tripped on something. Or if someone’s using a machine that you want to use in the gym, maybe you should ask to swap in with them between sets instead of unleashing the wrath of your roid rage against them.

Doleac argues that cognitive behavioral therapy can reduce recidivism by helping at-risk individuals think deliberately about their choices. If getting people to reflect on their actions can help them appreciate the consequences of those actions for others, maybe it might get them to think twice about committing a crime. To support this hypothesis, Doleac draws on a litany of studies, two of which I’ll cover here.  

## Case Study #1: Parcours

In 2007, the Quebec Correctional Services Directorate [tasked](https://www.erudit.org/fr/revues/crimino/2010-v43-n2-crimino1512856/1001780ar/) criminologist Denis LaFortune with developing a program to rehabilitate the highest-risk inmates within the local prison system. For readers who are not Canadian like myself, Doleac helpfully contextualizes such inmates like so:

> Provincial prisons in Canada are similar to jails in the US; they house inmates sentenced for up to two years, as well as people awaiting trial.

For several years, government officials in Quebec had expressed an interest in understanding what could be done to reduce criminal offending among individuals who (a) actively expressed interest in committing crime and (b) were unwilling to take responsibility for the consequences of such behavior. The end result of LaFortune’s efforts was _Parcours_, a CBT-informed intervention which uses guided activities, homework, and group discussions to improve participants’ ability to understand and reason about the consequences of criminal behavior.

To assess the efficacy of _Parcours_, Doleac draws on a decision-maker experiment. Because local prison counselors in the Quebec system varied in their tendencies to recommend inmates to the program, and because assignment to prison counselors was largely random, the setup of the program provided a neat opportunity to estimate the effect of CBT when scaled across an entire prison system.

As it turns out, _Parcours_ [produced](https://github.com/williamarbour/JMP/blob/main/JMP_WilliamArbour_recent.pdf) large short-term reductions in recidivism! Inmates who enrolled in the program by virtue of being randomly assigned to a pro-_Parcours_ counselor had 1-year recidivism rates that were **18 percentage points** lower than their non-_Parcours_ counterparts. And reassuringly, this reduction in recidivism really seems to have been driven by the effect of the program itself. As Doleac notes, the relationship between being assigned to a “pro-_Parcours_” counselor and recidivism was only present when the program was actually available at the time prison counselors could recommend it:

>   
> If the results of this study are truly measuring the effects of Parcours participation, then being assigned to a Parcours-loving evaluator should have no effect during … periods when Parcours was not available … When Arbour ran this analysis, he found zero impact of evaluator assignment during no-Parcours times. The results passed this placebo test.

Thus, on paper, _Parcours_ provides strong evidence that cognitive behavioral therapy reduces criminal behavior.

My only gripe with Doleac’s invocation of this study is that, once again, the headline result is barely significant (p = 0.038)! So while I am inclined to believe that _Parcours_ reduces recidivism by _some_ amount - participants in the program did, after all, manage to have lower recidivism rates than non-participants despite being selected for _worse_ behavior - the magnitude of this reduction is likely over-estimated.

## Case Study #2: Becoming a Man

An additional piece of evidence cited by Doleac in favor of CBT is a series of randomized evaluations of the _Becoming a Man_ (BAM) program. In “_Becoming a Man”_, participants (usually adolescent students) complete ~20 hours of guided lessons which teach them how to identify cognitive errors that [have](https://crimelab.uchicago.edu/projects/becoming-a-man-bam/) “particularly high stakes in economically disadvantaged neighborhoods where guns are common.” Doleac gives the following example of a guided lesson dubbed “The Fist”:

>   
> Teens are paired up; one is given a rubber ball, and the other is given 30 seconds to get the ball out of his partner’s fist. Inevitably, the two teens end up on the ground, wrestling and fighting to get – or keep – the ball.
>
> After the teens switch roles and the same struggle occurs, the BAM counselor asks why no one just asked their partner for the ball. They usually look surprised and say something along the lines of, “The other guy would have thought I’m a wuss.” The counselor asks the partner if that’s true. The usual answer: “No, I would have given it to him. It’s just a stupid ball.”

Across two randomized evaluations of the program among at-risk youth in Chicago public high schools, the program produced large reductions in criminal offending. Doleac writes:

> For these high-risk teens, BAM participation reduced total arrests by 16 percentage points (27 percent), reduced violent arrests by 6 percentage points (40 percent), and also improved school attendance and graduation rates. The researchers concluded that BAM was effective at “helping youth slow down and reflect on whether their automatic thoughts and behaviors are well suited to the situation they are in, or whether the situation could be construed differently.”

So at an initial glance, BAM demonstrates that cognitive behavioral therapy has genuinely transformative crime-reducing potential. Just 20 hours of structured curriculum helped kids learn to desist from anti-social behavior.

Alas, if only things were that simple.

Following the success of the original BAM evaluations, the program was scaled up to a larger number of Chicago high schools, and this time around, the results were not so remarkable. In [subsequent randomized evaluations](https://www.nber.org/papers/w28406), arrests were no longer significantly different between students exposed to BAM and students in the control group.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/8c6c7e58f6b2bbc9.png)

<figcaption>

Figure 2 of Bhatt et al (2021). The impact of participation in “Becoming a Man” on arrests as the program scaled up over time.

</figcaption>

</figure>

Why the failure to replicate? No one really knows, but one hypothesis is a lack of access to high-quality facilitators. As the program scaled up, it may have been forced to rely on facilitators who were less capable of implementing the curriculum with high-fidelity.

Perhaps a bigger question about this failed replication, though, is _why is it_ _never explicitly mentioned_ _in the book_? Once again, I do not know the answer to this question. While Doleac does make a passing reference to “[the] work needed to figure out how to scale [CBT] programs”, she surprisingly does not acknowledge empirical reality of this challenge. What I can say, however, is that more research is clearly needed to understand under what conditions CBT impacts criminal offending. In developed countries, the existing literature produces results that are too all over the place to be consistent with a uniformly large reduction in criminal behavior.

## All The Things That Didn’t Work

In light of my disagreements with Doleac about the efficacy of CBT, it might be tempting to conclude that “The Science of Second Chances” is just another one of those pop-science books that will be a victim of the replication crisis - a tome that rests a top of pile of p-hacked research to declare knowledge of the social world where none exists.

There is a reason, however, why I chose to begin my review with praise for Doleac’s humble approach to identifying worthwhile criminal justice policy. In the book, Doleac devotes large amounts of time towards discussing policies which _failed_ to reduce crime in rigorous evaluations, and importantly, she shows no mercy to both progressive and conservatives in highlighting such failures. Notable examples include:

* **The failure of comprehensive case management services.** In a [large-scale randomized evaluation](https://www.dol.gov/sites/dolgov/files/ETA/publications/ETAOP-2015-10_The-Evaluation-of-the-Re-Integration-of-Ex-Offenders-%28RExO%29-Program-Final-Impact-Report_Acc.pdf), using case managers to help ex-convicts find jobs failed to improve both employment and recidivism. It turns out that it is quite difficult to convince employers to hire ex-convicts, a theme that Doleac returns to multiple times in the book.

* **The failure of halfway homes.** In a [decision-maker experiment](https://www.aeaweb.org/articles?id=10.1257/app.20200150), ex-convicts who were randomly provided with transitional housing were, if anything, _more likely_ to be re-incarcerated. In my opinion, these lackluster results combined with the extraordinary fiscal cost of such programs suggests that they either need to be seriously reformed or abandoned as an approach to re-integrating ex-convicts.
* **The failure of intensive supervision probation.** Across [multiple randomized](https://www.rand.org/content/dam/rand/pubs/reports/2007/R3936.pdf) [evaluations](https://journals.sagepub.com/doi/10.1177/0011128714555757), requiring probationers to maintain frequent contact with probation officers and undergo random drug testing failed to reduce recidivism relative to probation as usual. A more intensive probation experience did not produce material improvements in public safety.
* **The failure of truth-in-sentencing policies.** In a [difference-in-differences experiment](https://kuziemko.scholar.princeton.edu/sites/g/files/toruqf3996/files/kuziemko/files/inmates_release.pdf), barring early release of individuals from prison in response to good behavior _increased_ the chances of re-incarceration. By removing the incentive to display good behavior while incarcerated, such policies discouraged inmates from participating in programs that would have otherwise placed them on a better path.

Thus, while I don’t think you should take every study cited in “The Science of Second Chances” at face value, Doleac’s near-consistent acknowledgment of failed interventions is a genuine breath of fresh air in a discipline that is all too keen on ignoring them. The specific examples of policy failures she discusses are also illuminating insofar as they make clear that ideas which look good on paper are not always effective in practice.

## The Elephant in the Courtroom

“The Science of Second Chances” covers a truly wide range of criminal justice policies. Doleac discusses interventions at virtually every stage in the criminal justice system ranging from efforts to prevent people from entering the system in the first place all the way to initiatives which help ex-convicts re-integrate into their respective communities, and this comprehensiveness is undeniably a major strength of the book.

I could not help but notice, however, that the book never mentions a fairly famous (or infamous, depending on who you ask) policy used to fight crime: Three-Strikes Laws. As the name suggests, Three-Strikes Laws impose strict penalties of incarceration when an individual commits a third crime above a particular threshold of severity. For example, when California passed a Three-Strikes Law in 1994, criminals convicted of a felony who had already been convicted of one or more serious felonies in the past [faced](https://www.sandiegocounty.gov/content/sdc/public_defender/strikes.html) a minimum 25-year long prison sentence.

There are multiple reasons why Three-Strikes Laws deserve to be discussed in “The Science of Second Chances”.

1. First, as stated in a [review](https://us.macmillan.com/books/9781250886286/thescienceofsecondchances/) of the book from _Slow Boring_ writer Matt Yglesias, “most crime is committed by repeat offenders”. It is a natural impulse, then, to try and reduce crime by incarcerating offenders who repeatedly commit serious crimes.
2. Second, if we are interested in making substantive policy recommendations in the criminal justice space, we cannot literally limit ourselves to discussing “second chances” alone. We must also consider at what point we draw a line in the sand and say that certain behaviors are unacceptable in polite society. Do we stop at a third chance, a fourth chance, or somewhere beyond?
3. Third, three-strikes laws have been a common way for local and state governments to respond to concerns about crime from the public.

And yet, despite these compelling reasons for inclusion, Doleac does not explicitly mention Three-Strikes Laws anywhere in the book. The closest thing the reader is given to an in-depth treatment of such laws is a more general purpose discussion about the efficacy of long prison sentences which, while illuminating, does not tell us enough about the efficacy of initiatives to crack down on repeat offenders specifically.

Like sure, it is useful to know that long prison sentences have diminishing returns over time and that criminals are probably not deterred much by them anyway. But what about the incapacitation benefits that materialize when an offender with a substantial rap sheet is held behind bars for an additional decade? The book does not spend enough time on this question, and I think it is weaker because of it. Although “The Science of Second Chances” provides a fascinating window into the inner workings of many different criminal justice policies, Three-Strikes Laws are unfortunately not one.

## The Big Picture

After reviewing the efficacy of at least a dozen different policies to reduce criminal offending, Doleac ends “The Science of Second Chances” by discussing the many lessons she’s learned along her intellectual journey. More than any singular policy discussion in the book, this section offers what I would consider to be the most valuable words of wisdom for readers.

## Fail Fast

A key observation Doleac makes is that policymakers are too afraid of failure when their goal should be to fail fast.

>   
> When I talk with policymakers, I tell them their goal should be to fail fast – not to avoid failure. Failure is inevitable. But it is how we learn. Only by trying and failing and trying something else will we eventually find effective solutions.

I could not agree more with this advice. The reality of social change is that most interventions do not work. This wisdom has become so commonplace in policy evaluation circles that it even has a name: [The Iron Law of Evaluation](https://gwern.net/doc/sociology/1987-rossi.pdf)_._

Moreover, the Iron Law of Evaluation is relevant in many circles _outside_ of policymaking. In the tech industry (where I work), it is incredibly common for A/B tests to [have](https://eduardomazevedo.github.io/papers/azevedo-et-al-ab.pdf) zero effect on the primary metric of interest. In the pharmaceutical industry, about half of drugs tested in phase III clinical trials [fail](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2565686) to receive FDA approval. If product managers and pharmaceutical researchers who are paid six-figure salaries to figure out what shit works routinely experience failure in rigorous randomized evaluations, there is no reason to expect that policymakers will be different. What is important is that, like the individuals in such occupations, policymakers appreciate the value of experimentation and learn from failed experiments to design interventions that do work.

<figure>

![](https://acximages.ennals.org/images/2026-book-reviews/2e7853057b00fc46.png)

<figcaption>

Tech & pharma companies regularly use randomized evaluations to separate effective interventions from ineffective ones. Politicians, on the other hand, …

</figcaption>

</figure>

I suppose I would just add to Doleac’s point that the same criticism should be equally applied to academics. Attempting to publish a null result on a topic of great import should not be tantamount to academic suicide. It is about high time that social scientists start treating null results as _essential contributions_ to the broader body of knowledge in their discipline rather than [obstacles](https://academic.oup.com/ej/article-abstract/134/657/193/7238466?) to career self-advancement.

## Communication Silos

Separately, Doleac notes that the lack of coordination between academics and policymakers is a major challenge for policy evaluation.

> When I worked in an academic research setting, my colleagues and I spent a lot of time looking for interesting policies and programs to study … Now that I’m surrounded by policy experts and practitioners, I’m frequently asked why academics don’t study the interesting policies and programs that have been implemented … The disconnect between these worlds is huge. And it’s not because these groups don’t want to talk, or have fundamentally different goals or worldviews. These people simply don’t know each other.

This is a super evident theme throughout the book.

In the ideal case, government authorities would design policies in collaboration with academics so that they can be easily evaluated upon implementation. The best example of such a collaboration in the book is a partnership between multiple New York City agencies, the non-profit ideas42, and the University of Chicago Crime Lab. To evaluate whether re-designing court summons forms would help incentivize people to show up for court appointments, the NYC agencies tapped ideas42 and the UC Crime Lab to design a causally informative study. The latter groups responded by [setting up](https://www.science.org/doi/10.1126/science.abb6591) a clever regression discontinuity experiment, estimating a precise positive effect on court appearances, and ultimately, convincing the agencies to keep the re-designed forms in circulation.

In practice, however, policy evaluation suffers from a clear lack of coordination between academics and policymakers. Academics might scramble like chickens with their heads cut off to gather grant funding so that they can evaluate newly-announced policies in real-time, academic research is sometimes not even used to set policy agendas, or academic research is so late to the party that a bad policy has already taken its toll on the surrounding community. In a particularly galling example, Doleac describes a case where Australian politicians reduced reliance on electronic monitoring despite compelling [evidence](https://direct.mit.edu/rest/article/104/2/232/97696/Can-Electronic-Monitoring-Reduce-Reoffending) that the practice reduced recidivism among low-level offenders who used it as an alternative to prison.

To someone who comes from the tech world, this state of affairs is simply unacceptable. It’s like having product managers place dozens of new features on the product roadmap without ever actually evaluating them in A/B tests, and not only that, in the rare set of instances where A/B tests do happen, they are either ignored or take several years to get published in company-wide memos - in which time the feature will already have been launched or shut down. I could never imagine working in an environment like this!

To give credit where credit is due, Doleac is actively working to address this problem. Using her influence as a leader within the philanthropy organization Arnold Ventures, she routinely convenes events where policymakers and researchers can exchange ideas about how to improve the criminal justice system.

My sense is, however, that more transformative thinking about the academic process itself will be needed to create a robust policy evaluation-to-impact pipeline.

* How can journals expedite peer review so that academic research can actually be used to inform policy decisions before key political deadlines?
* How can universities forge connections between academics and policymakers to promote joint policy ideation and evaluation?
* How can social science as a discipline incentivize academics to optimize for policy impact rather than publication? After all, what if there was a world where an economist’s crowning achievement was not, say, the publication of an article in _The Quarterly Journal of Economics_, but instead the implementation of a law or program which actively makes people’s lives better?

On another cheeky note, it is a little surprising to me that, as someone who appreciates the communication disconnect between academics and policymakers, Doleac (or perhaps, her publisher) does not always act on that recognition. In this review, I’ve tried to include many visualizations to help contextualize how natural experiments can be used to estimate causal effects of policies. The book, however, does not include even one! This omission is not a problem for causal inference-pilled readers like myself, but I imagine it would be for a policymaker who has never heard of such statistical methods before. Just some food for thought.

## Towards A Safer America

Crime sucks. Violent crime inflicts lasting psychological trauma upon its victims. Disorderliness undermines the value of common goods like public transportation. Corporate malfeasance foments distrust in markets. Theft deters businesses from investing in a community. Workplace safety violations cause disabling injuries. And murder is the ultimate sin, depriving someone of the totality of future experiences that they would have otherwise gone on to appreciate in living. That crime sucks is obvious to anyone not living under a rock.

Policymakers, however, lack an adequate framework for thinking about crime. The public generally [trusts](https://www.pewresearch.org/politics/2025/10/30/how-americans-see-the-parties-on-key-issues/) Republicans more on the issue due to the party’s perception as being “tough on crime”, but as we have seen in the examples of misdemeanor prosecution and truth-in-sentencing policies, too much rigidity can have unintended consequences.

In my view, “The Science of Second Chances” offers a way out of this problem. When we run experiments to evaluate the efficacy of different policies and use those experiments to drive decision-making, we can make real, even if only incremental, reductions in criminal offending. To the extent that the book has a singular take-home message, that would be it. In isolation, cognitive behavioral therapy, felony diversion, DNA databases, or any of the dozen other policies named in the book will probably not have some earth-shattering impact on crime. But add up the effects of all of these interventions together, and you’ll see real progress!

As the saying goes, Rome wasn’t built in a day. Neither will a safer America. That’s the reality of engineering social change.

## Footnotes

[^1]: The rankings shown in the linked sources should not be interpreted as exact. For example, Buil-Gil, Sanchez, and Aebi (2026) [show](https://link.springer.com/article/10.1007/s11205-025-03802-8?utm_source=chatgpt.com) that differences in how homicide is recorded in European countries can cause national rankings by homicide rate to shift around by 4.2 places on average.

[^2]: Kilmer et al (2012) [report](https://ajph.aphapublications.org/doi/full/10.2105/AJPH.2012.300989) a p-value of 0.023 for the main result. Midgette et al (2022) [report](https://pmc.ncbi.nlm.nih.gov/articles/PMC8414695/) a p-value of 0.037 for the main result in Figure 5. Midgette and Kilmer (2015) [report](https://www.rand.org/pubs/working_papers/WR1083.html) a p-value of 0.027 for the main result in Column 3 of Table 14.
