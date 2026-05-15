---
title: Nightmare Pipeline Failures
author: Unknown
reviewAuthor: Anonymous
contestId: 2023-book-reviews
contestName: 2023 Book Reviews
year: 2023
publishedDate: '2023-01-01T00:00:00.000Z'
slug: nightmare-pipeline-failures
wordCount: 7791
readingTimeMinutes: 35
originalUrl: https://docs.google.com/document/d/1vci14HMZ2UEJBs6mKCZZ2vHs-jVuPSsFsiN3cAENzXU
source: gdoc
tags:
  - History
  - Politics
---

There’s a familiar story that appears on the news roughly once a year, which pretty much goes like this:

It was another normal business-as-usual day when someone who operates a piece of highly complex equipment notices something weird. This happens pretty regularly, so this person does what they normally do, but unbeknown to them, this time, the alarm is real, or the signal is actually not a harmless thing, and suddenly, something very bad happens.

In industries that deal with these types of systems, this is known as a process safety incident. These are mostly in oil refineries, chemical plants, and similar, but I’d also count aviation and transport accidents.

In early 2023, this major process safety event was a Norfolk Southern freight train derailment near East Palestine, Ohio, releasing large quantities of toxic chemicals impacting residents and the environment.

By total coincidence, I was reading _Nightmare Pipeline Failures - Fantasy Planning, Black Swans, and Integrity Management_ by Jan Hayes and Andrew Hopkins, which is a book about process safety incidents. Two specific pipeline failures from 2010 - a gas transmission line explosion in San Bruno, California, and an oil spill into the Kalamazoo River near Marshall, Michigan - are presented as case studies, supported by references to the National Transport Safety Board (NTSB) investigations, where evidence is made publicly available on their website.

There’s not much overlap in the specifics, but I suspect many points discussed in this book are applicable to the Norfolk Southern incident. The NTSB is investigating, and I know I will be looking at this accident docket when it’s available.

## I. Introduction

The worst nightmares of the oil and gas pipeline industry are coming true in the United States.

That’s the opening line of the book. I really like it - concise, to the point. The main thesis of the book is that both the likelihood and consequences of pipeline accidents have increased, for a number of reasons:

> 1.  Increasing population density means urban areas now encroach on pipeline corridors, which increases the severity of an accident (more fatalities) and means more activity could disturb the line
> 2.  Much of this infrastructure is old, which presents many problems - corrosion being the main one, but also being built to older, less stringent construction standards and _not_ being subject to some of the quality assurance checks that apply to new builds - so in addition to corrosion and fatigue, there’s the “ticking bomb” factor
> 3.  Operating conditions have changed - the Michigan oil spill involved a relatively new type of crude oil product from tar sand extraction (which wasn’t the product the pipeline was originally built to transport), modified for transportability, which had an outsized environmental impact (being very difficult to clean up).
> 4.  Being both US pipelines, subject to US regulations, operated by US corporations, there is a broader trend in how US companies manage these types of risks - or rather, how they’re failing to manage them, and why

Extensive references are made to the National Transport Safety Board investigations of these incidents. The NTSB [website](https://www.ntsb.gov/investigations/Pages/Investigations.aspx) is quite a good place to visit, if you ever want to read reports of plane crashes and similar - they list open investigations (like the aforementioned [Norfolk Southern](https://www.ntsb.gov/investigations/Pages/RRD23MR005.aspx) accident), as well as all material used as evidence in past investigations (which are compiled into accident dockets, and you can download everything on the docket to read yourself). I’m impressed with the transparency and accessibility.

What I’m personally interested in delving into is, primarily, the fourth point - how these organisations created the conditions where process safety events were only a matter of time.

I think it’s broadly applicable to how _most_ large organisations work, which is terrifying. There is a fair bit more information on Pacific Gas & Electric’s management of pipeline integrity - so for this reason, I’m going to limit discussion to the San Bruno accident specifically.

## II. So, What Happened?

On the 9th September 2010, just after 6PM, a large fire / explosion suddenly erupted in San Bruno, a SF Bay Area suburb next to the airport. I found a [video](https://www.youtube.com/watch?v=g-qDKVduoXU) of this fire on YouTube, to get a sense of how huge it would have been (you can also watch the [surveillance footage](https://www.youtube.com/watch?v=BHyrf1llJWs) of shoppers nearby noticing the blast and panicking).

To the residents, it probably wasn’t immediately apparent what the cause of the explosion was - the gas line was buried, so many people probably didn’t think about it much, and there was the airport only five miles away, and it was only two days before the ninth anniversary of 9/11, so the initial prevailing theory was another plane crash / terrorist attack.

Around 7PM, the cause was confirmed - the high pressure buried gas pipeline had ruptured and the gas leak had ignited.

Gas pipeline explosions tend to be very high energy - in many places, gas hazards are ranked using tonnes of TNT equivalent. At least a hundred homes were damaged by a shockwave that measured as a 1.1 magnitude earthquake, over thirty homes were fully destroyed, and the blast left a [40 foot deep crater in the street](https://upload.wikimedia.org/wikipedia/commons/8/87/Pipe-from-Sanbruno-explosion.jpg) and threw a 1000kg section of pipe 10 feet.

Even though Pacific Gas & Electric cut the gas somewhere between 60 to 90 minutes after initial explosion, the fire blazed until nearly 12PM the following day - the isolation point for a large distribution line like this would have been miles upstream and even without further flow, it would have been an absurd amount of fuel left in the line.

That’s the point of view from the residents of San Bruno.

From the view of the owner and operator, PG&E, several hours before the explosion, some scheduled routine field maintenance was taking place at Milpitas Terminal, upstream of this line.

Milpitas was a fairly standard gas transmission terminal - four inlet lines, five outlet lines (including line 132 - the buried line which failed). Each line had an automatic valve - when high downstream pressure is detected, the upstream valve will automatically shut until the pressure releases.

Field technicians at Milpitas were working on upgrading the power system. No gas interruption was planned for this. The technicians were in constant communication with the pipeline operators in the remote control room. This is standard practice - control room is responsible for monitoring gas flow and pressure, so any interruptions require constant comms.

As part of the work, the power to the terminal would be interrupted, so the technicians switched the control valves from automatic to manual operation to keep them open. While the power was out, the control room would be effectively blind - but the field technician team did the work, turned the power and comms back on, and switched the valves back to automatic.

After restarting the terminal, the field team noticed that some indicators were still off, even though they’d turned the power back on. They didn’t pass these observations on to the control room - they just continued work.

Around an hour before the rupture, in the control room, some 60 alarms appeared suddenly. These were high pressure alarms, and some reverse flow alarms. They phoned the Milpitas technicians - were these real? What’s happening? Where’s the pressure come from? - and throughout these discussions, discovered that some of their valve position data in the control room was wrong. No one knew which valves were open and which were closed; but they concluded that at least some of the high pressure alarms were real, but couldn’t identify why.

Later investigation found that the maintenance work had introduced an electrical fault, and all the upstream pressure regulating valves had fully opened.

A field technician manually measured the pressure in the downstream header, finding 396 psi - which was below the maximum allowable operating pressure (MAOP) of 400 psi for the system. Not great, but no need to panic. They spent the next few minutes fiddling with the valve setpoints to bring the system back to normal.

At some point, the pressure hit a safety valve on line 132. Safety valves are standard gas industry fittings - when a higher than expected pressure hits the valve, the valve closes, and (in theory) the downstream system it’s protecting doesn’t get pressurised to a dangerous level. This valve closed at the set point, but line 132 was already pressurised for a few minutes - and by the time the valve shut, the downstream pressure gauges read a big drop.

A sudden drop of pressure usually means the gas is all going somewhere very quickly - and in this case, this was when line 132 ruptured, spilling a large amount of flammable gas into the neighbourhood of San Bruno. It took over an hour before the control room operators realised what had happened - linking the explosion to the overpressure event.

Line 132 was constructed in 1956. It had ruptured at Section 180, along a defective longitudinal seam weld. There was no evidence that this section had ever been tested or inspected - not when it was first built, not at any point during 50 years of operation. It was a fabrication defect - one that had been there from day one - and it caused the line to fail below its maximum allowable operating pressure.

## III. Just Following Procedures

Most process safety literature steps through the blow-by-blow of what happened in the terminal and in the control room - what paperwork various people filled out, what they wrote, whether they followed procedure, what was the procedure and so forth. This book is no exception - but to explain the first failure in (what happened in the field), they provide an explanation of the types of rules used in industry.

There are three types of safety rules and procedures (general consensus among process safety experts), which are:

> 1.  Goal-based: rules that specify goals to be achieved
> 2.  Process-based: rules that define the process to be followed in order to decide on a course of actions
> 3.  Action: rules that define a specific concrete action or system state

Most modern process safety rulesets and systems are a combination that include features for everything, because these all have a time and place.

A goal-based rule, for example, can be, “ensure that the work is completed with no injuries or fatalities.”

A process-based rule could be, “prior to starting work, plan the activity in advance and obtain permission from someone who oversees all work on site; this person will ask questions and might request that you take specific precautions before allowing the work.”

An action rule would then be, “you must hold this licence to do this work (e.g operate an excavator).”

These are generalisations, but it’s a fairly important framework. Every organisation has rules, implicit or explicit, and issues often arise when rules are defined poorly. Think back to being in school, for example. The principal most likely got a goal-based rule from the education department, something like “ensure the kids are educated” but sometimes more specific, like “raise the average test scores up to x%.”

The principal might directly communicate this goal to the teachers, or they might think they want a process-based rule, so they might come up with, “teachers where the class average is lower than this score must speak to me about it and we will have a meeting to come up with a plan to fix it.”

Then teachers are often free to define rules for students, so you might get rules like, “score over X% on this homework sheet to be completed every week, attend remand class if you score lower or don’t do it,” either as a recommendation from the meeting with the principal (output of a process) or just a pre-emptive action rule to meet the goal-based one.

Like most hazardous industries, PG&E fieldwork is governed by permit to work - a process-based rule, and a fairly industry-standard one. When work is being planned, a permit is prepared and submitted to an authority (in this case, Gas Control). The work does not go ahead unless Gas Control has ascertained that it can proceed with no risk. At least, that’s the idea.

The permit paperwork submitted to complete the work at Milpitas on September the 9th is on the [NTSB docket for San Bruno](https://data.ntsb.gov/Docket/?NTSBNumber=DCA10MP008) as Exhibit 2AM. I’ve excerpted the relevant sections here:

![](https://acximages.ennals.org/images/2023-book-reviews/bd5a7de5d106e955.png)

![](https://acximages.ennals.org/images/2023-book-reviews/b5d740c131508d77.png)

[I’ve censored the names and numbers of the techs involved, but the NTSB did not do this, which seemed weird to me. I hope they’re work numbers.]

My excerpt, sadly enough, only leaves out a few other unfilled pages of the permit form. I’m assuming this originally also came with a drawing of the terminal that they’re replacing, and that would be about it.

This is my “favourite” part:

![](https://acximages.ennals.org/images/2023-book-reviews/692f50594690f346.png)

It’s a little unclear how many hands ultimately handled this document. It was prepared and signed off by the field supervisor, and signed off by Gas Control (presumably an operations representative). It was also distributed to seven other people - who are apparently “Mandatory” to notify. Also, one of these people was “TBD”, which is always encouraging to see on safety-critical paperwork.

I would imagine this meant emailing a copy of this form to these seven people, where it would get lost in an inbox of around 3,049 unread emails, most of which probably was other work clearance forms. If you work in any kind of form-heavy industry, I’m sure you have been either or both of the person emailing a document that will never get read, and the person with the inbox full of unread documents.

The procedure is silent about exactly what these people needed to do with this document. If I put myself in the shoes of, say, the facility engineer, and I get like 30 of these things every day, without a clear directive from the procedure to tell me what exactly am I supposed to do with these, and I have to plan next year’s maintenance campaign, deal with faults someone found the other day, and my manager is asking me to decide which of next year’s maintenance we can defer and how much budget we can hand back - you can be fairly sure that these are never getting looked at. Especially if the last part (finding budget savings) is tied directly into my annual bonus or some kind of incentive, and reviewing this random form is not.

So there is the issue with process-based rules: they don’t work if there’s no clear ownership and they don’t work without competence. If these two things are missing, the permit to work system turns into a bunch of pointless paperwork to tick some boxes.

Most permit to work systems have a risk assessment step - but, not unique to PG&E, they’re usually done by the field workers and focus almost entirely on personal safety (i.e whether removing this panel would electrocute anyone doing the work). This is what happened here - there’s a single box asking if this would result in a planned service interruption, checked no, because _if everything went as planned_ this was the case. But there doesn’t seem to have been any consideration of what valves did you have to open / close, and whether there was a risk of seriously impacting the pipeline if you, for example, opened and closed valves in the wrong order.  

So, why even have procedures like this? Isn’t this just pointless box ticking and a waste of time?

I will skip to the authors’ conclusion in Chapter 6: it’s to comply with the safety rules. Tautological, isn’t it?

## IV. The Letter of the Law

In Australia and the UK, major hazard facilities (the kind of places where a major accident must not happen - power plants, gas plants, and such) must submit a safety case to the regulator. This document is a record of the facility’s plan to prevent accidents. It should cover things like “how do we make sure no one ends up jackhammering a live pipe by accident” and “how are we ensuring our pipes aren’t rusted and holey” and “this is how we make sure no random teenagers can break in and set off fireworks on top of the propane compressor”. This is the mechanism enforcing the ‘goal-based’ law - letting the responsible party determine a set of reasonable rules, and holding them to account if anything goes wrong.

Most of the US, however, have action-based laws. California, specifically, had the following suite of laws that applied at various times throughout the life of line 132, up until its fiery end:

*   1956, the pipeline was constructed. No specific laws apply, however industry mostly followed the standard ASME B31.1.8 (1955), which stated that new lines shall be hydrotested to a factor above maximum allowable operating pressure (MAOP).  
    Line 132 was not hydrotested at construction (there’s no record, and it probably would have failed if it was tested)  
    
*   1961, California General Order 112 - new pipelines are to be hydrotested to ASME B31.1 (1958), however nothing about old pipelines specifically.  
    
*   1970, Federal 49 CFR 192.505 - new pipelines are to be hydrotested to 1.5 x MAOP, however a grandfathering clause explicitly states that for existing lines, MAOP shall be the highest pressure the line has been exposed to prior to 1 July 1970
*   2004, Federal 49 CFR 192.917(e) - existing lines must be hydrotested if operating pressure rises above pressure seen in the last 5 years

I did find it baffling that US laws explicitly state when something needed to be hydrotested, but in this case, if the intent was to find unsafe lines by forcing operators to hydrotest, it certainly didn’t work. There were a number of clever loopholes for an old enough pipeline - such as the provision requiring hydrotest if the operating pressure is greater than any pressure seen in the last 5 years. The loopholes are almost certainly written in because of industry lobbyists, possibly even PG&E’s own lobbyists.

(For those not in the pipelines industry - a hydrotest involves filling pressure equipment with water, holding it at that pressure for some time while an inspector physically looks for water leaking out of it and monitors the gauge for pressure drop. If it doesn’t hold pressure, or if it leaks, it fails. There’s another version using air instead of water - a pneumatic test - with lower factors).

Why was the MAOP of this line 400 psi, in the absence of any kind of hydrotest, ever? Why did it need to be 400 psi, when the service pressure wasn’t actually that high?

This is thanks to the 1970 and 2004 laws. The highest pressure line 132 saw previous to July 1, 1970; and then from 2004 onwards, PG&E would _deliberately raise the pressure to 400 psi to keep the rating_. This sounded so wild, I had to go read it myself, from the NTSB Public Hearing Transcript Day One (it’s on page 83)  

> MR. TRAINOR: Are there any other considerations to MAOP for pre-1970 lines?
>
> MS. PERALTA: We choose the pressure based on our operating records that we have which indicates a safe pressure that the pipeline had operated at during those 5 years.
>
> MR. TRAINOR: Okay. And when you test the line every 5 years, the pre-1970 lines, what's the duration of time the pipeline is operated at MAOP?
>
> MS. PERALTA: So when we do the planned pressure increases, and sometimes just through regular operations, the pipeline will reach its 5-year maximum operating pressure, in which case there's no need, but when we conduct these planned and monitored increases, it's held for approximately 2 hours.

These people are running a pneumatic test for all their old 30+ year old lines, except instead of an inert gas, they’re doing this in service using actual flammable gas. So, they do this for all their pre-1970 lines, they hold it there (full of actual flammable gas??) for 2 hours, and they’re not telling anyone while they’re “testing” it, despite the line _running under densely populated suburbs_.  

In 2010, regulations in California were still action-based (unsure about the rest of US). I don’t know if this is still the case, but I suspect that it still is, given the intense debate about electronically controlled pneumatic brakes on the Norfolk Southern case.

The problem with prescriptive / action-based laws is that the regulator must be on top of all new safety innovations, which is, of course, a lot to ask of politicians that have very little knowledge of all of these specific fields. Every time someone invents a new kind of brake, the law has to go back through the House and the Senate for an update, where it somehow gets tangled up in partisan politics and culture war garbage and suddenly someone is getting accused of being a communist just because they’re trying to update the minimum legally mandate brakes to match current maximum train speeds. This is very far from being a sensible way of managing safety legislation.  

Under goal-based safety laws in Australia and the UK, the responsibility of the operator would not be to run a specific type of brakes - it would be to make the trains safe. It is still possible to be cleared if it was a genuine freak accident, but that’s not an argument that would fly for predictable failures. I have no idea if such a law could be enforceable in the US, or would all the judges just say they’re all acts of God?

If the laws were somehow updated to be goal-based, the incentives for these engineers would change. Your job is no longer to look for loopholes where you don’t have to hydrotest. Your job is (hopefully) to make things _safe_.

## V. Risk Laundering 101

This is most likely a familiar subject to anyone who reads this blog, and is a frustrating feature in many organisations. It’s probably fine if the organisation is in charge of making lipgloss or whatever and have to sometimes recall lots of lipgloss but the consumer can always find an alternative, but unfortunately, lots of organisations everywhere have absolutely awful epistemic practices - especially around risk, which is unacceptable when they deal with hazardous infrastructure and vital goods and services.  

PG&E did do the responsible thing of having an integrity management system for their network of multi-decade old pipelines. At least, that’s what their VPs and executives said during the NTSB investigation.

However, this system immediately falls apart on closer scrutiny. Chapter 5 is about this integrity management system, which is an incredibly infuriating read and probably the part that reflects the worst on PG&E.

The subtitle of this book is “Fantasy Planning, Black Swans and Integrity Management” - refers to what I would call ‘risk laundering’ - the tendency for certain inconvenient risks to simply evaporate from consideration after going through a few desktop studies.

For example, corrosion on pipelines. It is very expensive and difficult to excavate miles of buried pipeline, even more so when they run under suburbs like San Bruno. No one wants to recommend doing this (particularly in cost-focused organisations). However, maybe someone will go, “what are we doing to manage our old pipelines?”

To address this, they’ll have an integrity management system - and there is the trap that many organisations end up falling into. An integrity management system is supposed to represent risks and make recommendations on what to do about them - in theory. In practice, if no one is actually thinking too hard about what they’re supposed to achieve, they can get co-opted into “demonstrating” that there is no risk. Organisations can end up spending lots of time massaging numbers in these programs, rather than actually going out to check things.

PG&E had a geographic information system (GIS) to record and manage pipeline data. For maintenance planning, they used risk index modelling - a method that assesses risk of a group of assets (in this case, pipeline segments) relative to one another, as opposed to absolute risk.

Firstly, looking at the GIS - the data in it was just plain wrong. They weren’t considering the risk of a longitudinal seam weld rupture because the GIS stated that the section was a seamless carbon steel pipe.

Forgivable, except for a crucial fact - line 132 was a 30” bore pipe, and seamless 30” bore carbon steel pipes didn’t exist in 1956 or 2010, and I don’t think it exists in 2023. Seamless pipe is manufactured by drawing a billet through a die - and this technique tops out at probably 20” or so. Really large bore carbon steel pipes can’t be seamless - they are always long seam welded for hazardous products.

This shows that no one familiar with line pipe has ever checked the PG&E GIS data, because this isn’t particularly esoteric knowledge for someone who has been heavily involved in pipeline construction and inspection. But it is an assumption a fresh engineering graduate or a generalist consultant (like Bain, Deloitte, etc… who also hire fresh engineering graduates) won’t think to check.

So right off the bat, based on unverified information in the GIS, PG&E is already managing a fantasy pipeline.

They then use risk index modelling - which divides all their pipelines into a large number of segments, assigning each a risk score, and ranks the segments according to risk.

Let’s start with the first problem: using a relative risk score to obscure the absolute risk.

Where does PG&E draw the line on what to repair? They probably don’t do this explicitly - engineering gets a maintenance budget item, and they treat the risk index as a “queue” - high risk gets inspected, low risk does not. The glaring problem there is how low is low risk? If your budget can only cover your top 20 worst pipeline segments, how would you know that number 21 isn’t going to blow up?

A good integrity management system must define the budget based on the work required to mitigate risk. If you learn that you have a vulnerability that is going to cost a million dollars to fix, you must find the money somewhere. However, in this company, available budget is deciding what gets done - not risk. If there isn’t enough budget to fully maintain the system, it will deteriorate faster than it gets repaired. It’s still going to fail!

In this specific instance, it’s also not good practice for corrosion defects, specifically, to be left to sit for too long. Most of these lines are coated, so failure goes from the stages of coating failure → minor corrosion → severe corrosion over time. Coating failure is easy and cheap to fix. Minor corrosion may require a little more intervention and assessment. Severe corrosion means the segment will need to be fully replaced - cut out and reweld. Every stage involves reapplying the coating.

So taking a birds-eye view of the maintenance budget, if you need something to run for many decades, a regular recoat is the obvious winner for both cost and risk (potentially run to failure and fully replace might win on cost sometimes, but for most gas pipelines, critical bridges and other major infrastructure, the risk of failure is unacceptable).

Since corrosion defects tend to get worse and more expensive over time, it’s not a good idea to kick minor defects down the road - it’s a great way to blow out a maintenance budget.  

Digression aside, the actual risk assessment calculation is awful. It doesn’t just fail at representing risks correctly - it actually makes high risk items seem less risky.

The risk score assigned to each segment has a consequence of failure component and a likelihood of failure component, which is pretty standard.

Likelihood tends to be what trips most industrial risk assessments up. How do you account for every possible way a pipeline could fail? There’s quantitative modelling, or getting someone to assign a qualitative score (when I do this at work I call this “vibes-based” scoring, which honestly, completely depends on who’s picking the number in how good it is).

PG&E decided to split the difference and use this equation:

LOF = 0.25EC + 0.45TP + 0.20GM + 0.10DM

Each of EC, TP, GM, DM refer to the likelihood of failure due to a certain reason - External Corrosion, Third-Party Interference, Ground Movement and Design / Material.

The multiplier of each of these was from a statistical analysis of previous pipeline failures, which is somewhat understandable (although the NTSB investigation points out, if that’s the basis, it’s not even correct - some 50% of their failures from 2004 - 2010 were external corrosion).

Now for the magic trick: watch this extremely old, badly corroded pipeline turn into a non-existent risk using this formula!

Scenario 1: 40% EC, 30% TP, 20% GM, 30% DM; the LOF score would be 30.5  
Scenario 2: 90% EC, 10% TP, 10% GM, 10% DM; the LOF score would be 30

That’s odd - to calculate the probability of a line failing for _any reason at all_, you should get:

Scenario 1: Probability of failure = 1 - (0.6 \* 0.7 \* 0.8 \* 0.7) = ~ 76%  
Scenario 2: Probability of failure = 1 - (0.1 \* 0.9 \* 0.9 \* 0.9) = ~ 92%

In short - this risk indexing method is profoundly, _criminally_ bad, and everyone who uses something similar desperately needs to sit a remedial statistics course. The risk indexing exercise is actively worse than useless - it provided an illusion of certainty, while spitting out meaningless numbers. Using a pure vibes-based approach would have been better!  

The problems don’t end there! Why even consider third-party and ground movement in this calculation, when it’s being used to decide what to inspect? The thing with someone striking a gas line and causing a leak - control room will find out about it, effectively immediately. Ground movement damage inspections only need to happen after earthquakes in the affected area. Variables that aren’t relevant to this decision should not be in this calculation!

The next step in risk laundering is to announce that you have mitigated everything above a risk ranking 40 (or whatever) and that’s it, the risk is managed, everyone pat yourselves on the back. Executives get a bonus for “driving cost optimisation of the inspection program”!

It’s also hugely convenient that when something like this happened, no one could see it coming - the line only scored 30 on the risk index, how could we have anticipated this? This event is now a “black swan event”.

## VI. A Magic Ritual to Ward Off Disaster  

Chapter 6 is probably my favourite part of the book, because it’s very illuminating on how people in large corporations tend to act, providing a great explanation of the decisions taken by various people involved.

Process safety incident investigations generally assume that no one comes to work intending to blow up a Bay Area suburb, and I’m inclined to agree with them. I truly believe most people working at PG&E were horrified that this happened.

Why would a group of people, who I will assume are generally smart, hard-working and well-intentioned, let this happen? How did no one notice that the permit system mostly seemed like ticking boxes, and the integrity risk ranking scores don’t make sense? We know that metal in the ground will corrode over time. We know that welds are weak points in pressure containing structures. These aren’t engineering problems - they’re management.

It’s not that PG&E didn’t care about safety - it’s stated as one of the company’s top priorities! They did work on metrics like recordable injuries, lost work days, and motor vehicle accidents, and even improved them - didn’t they?

I will quote this excerpt from the book verbatim:

> Perhaps the surest sign that the number of injuries is not a comprehensive goal in its own right, even for worker safety, is the way in which [[the 2009 Annual report](https://www.pgecorp.com/investors/financial_reports/annual_report_proxy_statement/ar_pdf/2009/2009AnnualReport.pdf)] treats the deaths of two workers. While this is acknowledged to be a “tragedy”, presumably these deaths account for only two injuries and so are not as significant as the overall statistical trend of injury reduction that PG&E has chosen to highlight. We find this paragraph particularly offensive for this reason.

What does a 50% reduction in recordable injuries mean, if your fatalities are up by two? I wouldn’t call this improved safety.

PG&E had a culture of treating safety (and the cost of managing safety risks) like a video game, or like magic spells - where some sequence of actions are performed and the pipeline is made safe. This is, once again, fantasy planning - these actions don’t have any bearing on safety.  

Example one, the MAOP exercise for the pipeline - increasing the pressure to some random number someone found in 1970 doesn’t make it safer.

Knowing that the pipeline last saw a maximum of 400 psi (in gradually increased steps) in 2005 tells us nothing about its ability to experience a sudden pressure spike to 400psi the 2010; in those 5 years the pipe may be more corroded, the cracks may have grown, and I’m concerned about the fact that if the pipe hadn’t exploded in 2010, they would have pushed the pressure up there anyway, risking the flammable gas leak into the suburbs, _on purpose_.

Example two, what the SVP of Engineering of Operations said in the public hearing:

> NTSB Investigator in Chief: The PHMSA regulation or the CPUC regulations are minimum safety standards. Is there a PG&E policy … that says wherever possible for public safety, thou shalt exceed those standards?
>
> PG&E Senior Vice President, Engineering and Operations: There’s not a standard that specifies thou shalt exceed, although there are cases where we do… it’s really an engineering judgement.

An engineering judgement, meaning when there is an issue, an engineer has to spend time investigating it, risk assessing it, and then argue for the budget to fix it to management. An engineering judgement means that it is case-by-case - rather than company standards mandating that the system is made safe, it’s up to someone in engineering to speak up.

This requires someone with integrity, a willingness to argue with the boss, and a great deal of professional pride.

Transcripts of interviews with PG&E employees are available on the NTSB docket. The authors summarised these as “almost without exception framed by reference to company systems, rather than reference to any broader understanding of responsibilities or context.”

For example, the interview with someone on the integrity engineering team (Exhibit 2BR) :

> Q. Describe how you use, for missing information, how you use -- how do you handle missing information as part of your pre assessment process?
>
> A. In the data mining effort, we would review project folders to clarify any missing information, to find missing information.
>
> Q. And if you're not able to find any particular missing information even after that, how would you handle that?
>
> A. We would stay with the engineering assumptions that were given to us.
>
> Q. Through that process, through that pre-assessment process, have you identified any pipe segments or lines that were based out of class for what you found based on the information that you found?
>
> A. I'm not familiar with that. I don't know.
>
> Q. You don't know that you found that or you don't know how to do that?
>
> A. It's outside of my responsibilities. So I don't know.
>
> Q. Okay. So in essence, you would -- whatever discrepancy you found you'd generate the form but then somebody else would make that determination?
>
> A. Yes.

So, not my job, don’t know, outside of my responsibilities - it’s not a place that rewards people for raising issues or questioning whether the system works. It’s not a workplace where you know what other people do or feel like you can question whether someone else is covering the bases.

Especially not if you’re early career, which was the case here.

He was an EIT, an Engineer in Training for the state of California, who joined PG&E in 2004. If he was pursuing a Professional Engineer certification, I looked up what he’d need. By my understanding, you’d need at least 24 months of relevant engineering experience if you don’t have a Masters in Engineering (vouched for by your employer), $175 to apply, an undisclosed fee payable to the exam administrator, and probably (considering the abysmal pass rate), some money to enrol in a preparation course.

I actually hold an American Petroleum Institute (API) certification. It was $900 to apply to take the exam, I needed two people from work to certify that I have relevant work experience, and I enrolled in a preparatory course that cost $4000. I would not have done it without the sponsorship of my employer (they paid for it all).

Which brings us to the problem - if being an engineer was dependant on you being employed by PG&E, would you have told them that perhaps, the way we manage risk is not enough? Would you have spoken up? And if they fired you (California was not a right-to-work in 2010, but I don’t know enough about whether they could have gotten rid of you anyway), your recommendations wouldn’t be implemented, anyway.

## VII. The Publicly Traded Regulated Utility

I also wanted to focus more on San Bruno, because the way PG&E specifically is structured kind of boggles the mind. I’m not entirely sure how Enbridge is structured, but that might just be a more normal large, monopolistic company puts profit-before-safety scenario - PG&E specifically has a weird (but not unique) corporate structure.

Chapter 8 has this handy table, which I will excerpt:

**Regulated Utility**

**Publicly Traded Corporation**

Provide safe and reliable service at fair rates

Answers to regulator (CPUC) as a proxy for the consumers of California state

Obligation: provides safe reliable power - hence will always be bailed out by the government

Retail rates set by regulator

Makes money when cost to deliver electricity is lower than regulator mandated retail rate

Maximises profits

Answers to shareholders, who are represented by the Board of Directors

Obliged to maximise profits; may decide to terminate service if not profitable

Retail rates set by market competition, budget set by Board

Makes money when rates charged to customers is greater than cost to deliver (and may set customer’s rates)

If run poorly:

Regulator to impose penalties or authorise rates rises to consumers, and may require specific actions.

**Cannot fail**

If run poorly:

Customers switch to competitors; company fails

So, this beast of a table is an attempt to explain what’s going on with Pacific Gas & Electric. Is it like this because it’s a regulated utility, prevented from raising the price of gas to cover maintenance costs? Or is it like this because it’s a predatory capitalist public-traded company?

The answer is…. It’s somehow both. And accordingly, it provides the worst of both worlds.

PG&E Company is a regulated utility, which has to answer to the regulator, California Public Utilities Commission (CPUC). CPUC sets what PG&E Company can charge consumers, taking into account PG&E’s planned maintenance.

However, PG&E _Corporation_ is a publicly traded corporation. And the _Corporation_ answered to shareholders and had the responsibility to maximise shareholder returns.

The Company and Corporation, until the rupture, held joint Board meetings. The Corporation is just a holding company - it has no other business, and its only source of revenue is the Company’s profits.

This presents some obvious incentives - we can never fail, because the state government will always bail us out. We are a state monopoly, so there’s no competitor to switch to. Our revenue is capped, so we have to cut costs.

The PG&E Company has two bosses - but CPUC isn’t the one that pays the executive bonuses. The PG&E Corporation is.

PG&E is effectively incentivised to present the biggest rate case it can persuade CPUC to accept, not do any of the maintenance, and pocket the profit. And if anything explodes, PG&E will not cease to exist, because they’re the sole electricity and gas provider in the state. They can blow up a thousand gas lines throughout the state if they want; but it will never be existential for the company.

In the three years leading up to San Bruno, the company spent $53 million on executive bonuses. It had no other source of revenue, other than what it got from the ratepayers, which was only authorised by CPUC to pay for pipeline maintenance. If I was a resident of California, I would be pretty bloody unhappy - it’s like the state level scam of your deadbeat son asking for money to fix the car, but he secretly spent it on alcohol, so one day your brake lines fail unexpectedly because it wasn’t fixed to start with.

This is why I hate privatisation of important utilities.  

On a sidenote, an awful coincidence - one of the fatalities of this incident was a CPUC employee who was evaluating PG&E’s plans to replace aged pipelines. Given the timing, I would assume that she’d just gotten home with her daughter.  

By the way, it’s not like PG&E has reformed - if you recall the wildfires / power blackouts in 2019? A PG&E transmission line failed and fell onto flammable bushland. They filed for bankruptcy again, escaping liability for the fires, but as of 2020 it’s back to business as usual.

## VIII. Okay, But I Don’t Work On Gas Pipelines

The authors consider only oil and gas, but I don’t think these failure modes only exist in that industry. I think that the world of today is too damn complicated, and lots of sectors are facing the issues of ageing infrastructure, outdated laws, and corporate irresponsibility - which leads to terrible risk management practices and lots of “black swans”.

Other potential high consequence, low risk events outside of hazardous industries:

*   Mass produced personal care products contain traces of benzene, putting large numbers of consumers at risk
*   Software firm releases a bug fix that inadvertently exposes a bunch of sensitive data
*   Banks recklessly investing customers’ savings
*   Poor hygiene in farming leading to disease outbreak

Does every industry need a Nightmare Pipeline Failures? Did the book accomplish much change?

Well, California did update its laws around hydrotesting pipelines, based on the [Office of the State Fire Marshall website](https://osfm.fire.ca.gov/divisions/pipeline-safety-and-cupa/hydrostatic-testing/):

“California law mandates that each pipeline system be tested at least every five years by an independent third-party approved by the Office of the State Fire Marshal (OSFM). Testing results are submitted to OSFM for review and concurrence. Tests are randomly witnessed by OSFM Pipeline Safety Engineers to verify compliance with the OSFM Pressure Testing Requirements. In certain cases, OSFM may also approve the use of internal inspection tools "smart pigs" in lieu of hydrostatic testing. In these cases, the test results are also submitted to the OSFM for review and concurrence.”

This is still very prescriptive - the OSFM has to review all these hydrotest reports, so if anything blows up, they’ll be liable.

Learnings that I think can be generalised across industries:

> 1.  Are the laws still fit for purposes? Are they currently only compelling an action (that marginally makes things safer now, but will soon be obsolete), rather than an outcome? There may be a number of low-hanging fruit in industries other than pipelines; if this review leads someone to put forward even one such suggestion in their field of expertise, I’ll consider this time well spent.
> 2.  How would you compel professionals to act in the interests of the public, rather than the interests of their employers to the detriment of everyone else? What can we do to improve accountability of professionals - especially in the labour force of 2023 and beyond, where people move around frequently and are often on short-term contracts?
> 3.  Corporations are constantly given the choice between “save money at the cost of increasing the risk of a really bad event” and “spend some money to mitigate a risk of a really bad event (but it’s not necessarily easy to prove whether it was effective)”. Most corporations usually lean towards the former - not because of any specific person’s actions, but because the incentives shape the culture which shape decisions over time (and decisions like making specific people redundant shape culture). Is there anyone working on identifying ways to compel corporations to choose the decision to spend money, and have a lower risk of accidents?

Overall I think it’s a good book as an introduction to process safety, thinking about integrity management, and thinking about risk management practices in the pipelines industry. I wish the authors discussed how to influence corporate incentives a little more (that was Chapter 8, but it was more a study of the factors behind the disaster - which, to be fair, “how to influence corporate incentives” is probably a problem that is inherently very difficult to solve, so it’s probably not a fair ask).

It’s fairly accessible - I’m not primarily a process safety professional, although I do work in integrity management on a hazardous facility. I found the window into US legislation interesting (as I don’t work in the US), and I especially enjoyed getting to know the NTSB website, which is a very accessible and comprehensive way to dig into industrial accidents in their jurisdiction. I wish more industrial accident investigations produced similar dockets to the NTSB, but it’s a little concerning just how many accidents are on the website.

In conclusion:

> 1.  I’m disappointed in American safety laws, but I’m very impressed with the agency in charge of accident investigation and reporting - check out the NTSB website
> 2.  Large companies can have shockingly bad safety management systems, the kind where people do a bunch of pointless paperwork just for the sake of paperwork
> 3.  Risk assessment methods can be deeply flawed, especially when comparing probability
> 4.  These factors won’t be fixed internally because it’s not in the companies’ short-term interest to actually look at risks properly - they might have to spend money to fix things!
> 5.  But we really need to force them to manage their risks - possibly by pushing for goal-based rather than action legislation
