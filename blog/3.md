---
title: "The Tech Tree Beyond Self-Driving Cars"
date: "November 4, 2025"
---

# The Tech Tree Beyond Self-Driving Cars

Much noise is made about "when cars will be able to drive themselves", and rightfully so. But discussed less is what comes after that.

Let's draw an analogy to cell phone development: for a while, the dream product was a portable device that can do what a landline phone does. Then that was solved, which was great! and then we kept going. First with incrimendal features, like texting, and emails. Then larger upgrades, like touch screens, internet browsing, games, social networks, editing 4k video for some reason, and so on.

Let's imagine what the "editing 4k video on your cell phone" of self driving cars might be.

## Real-Time World Mapping

The first obvious application: turn every vehicle into a Google Maps update node. Today, google maps gets refreshed on a timeline of months to years in some places, whenever one of those big stupid cars drives through town. When every self driving car has the hardware of a mapper car, that refresh cycle moves down to daily in quiet areas, to multiple times a minute in cities. That means better updates for traffic stops, accidents, construction. Today it's a suprise when those features work for us; it will eventually be obviously expected.

## Deep Fleet Analytics

Once you have vehicles constantly processing visual data and uploading insights, you can do more than write street structures to the map database. You can run analytics on what they see:

- Fashion metrics (What do pedestrians look like?)
- Retail foot traffic patterns
- Weather data

The privacy implications are obviously gnarly and are left as an exercise for the product people, I just connect the pipes.

## Config Service

I believe Tesla already has a version of this - they'll sync your seat position and settings to your account, so you can jump in a rental Tesla, and everything's already adjusted. But extend this to the ride-hailing network and it gets better:

- Payment info pre-loaded
- Your preferred temperature, music, route preferences
- Accessibility settings that follow you between vehicles

## Device-free Hailing

Assuming we've got the above tools in place, we can actually return to old school taxi hailing. You can wave down a robotaxi, and by the time it's slowed down to pick you up, it's identified your face and found your profile. Get in the back and say where you want to go.

## User Map Annotations

Here's something I run into every day: There are two roads to get to my house. One is normal pavement, the other is a gravel hill. On the map, they look identical. I want to be able to tell my car: "Never take the gravel road." Right now, there's no way to add that annotation. Self driving sessions are stateless, and my personal preferences are not in the google maps database. Other annotations might be things like:

- This neighborhood has aggressive speedbumps
- This road floods in heavy rain
- This intersection has poor visibility

Annotations could be routes to take or avoid under different conditions, neighborhoods to avoid, any local knowledge that you'd want weighed in your planning. We'll need a way to store that data from users in conjunction with geographic data for multimodal route planning.

Beyond this, I should be able to store my annotations as either just for me, send them to friends (the address of a secret party perhaps), or globally with all vehicles.

## Fleet Orchestration & Multi-Vehicle Control

If I own multiple autonomous vehicles, I want some fleet management:

- Load cargo in my pickup truck, tell my sedan to follow me during a move
- Send one vehicle ahead to a destination while I take another route
- API access for programatic control of vehicles (for the right cost, of course)

Commercial applications are obvious:

- Couriers coordinated through custom software interfacing with the vehicle API
- Mobile service businesses that dispatch vehicles programmatically
- Same-day delivery networks using personal vehicle fleets

## Child Safety & Access Control

All of the above can be used to extend access to comoditized transportation to kids:

- Whitelisted destinations (home, school, friend's houses)
- Time-based rules (different permissions before/after curfew)
- Geofencing
- Parental payment accounts
- Real-time location tracking

And, since we're waving our hands here, the right escalations in place (to humans in the loop or a benevolent in-vehicle language model) to override all the rules if something really interesting is going on. Perhaps the cars will allow you to get a ride to a hospital, even if it's after curfew. That seems like a good idea.

## Distributed AI Inference Network

This one does already get tossed around a lot: use idle vehicles as a distributed GPU cluster. Most cars sit parked 95% of the time. Maybe less so in this future, but what the hell.

## Vehicle-to-Vehicle Communication

Right now, V2V doesn't happen because it's not fast enough to coordinate in normal driving. But assume that's taken care of, and each car can already function independently, you can still layer on V2V channels for other things:

One of the purposes of an ambulance is to invoke priority access to transportation infrastructure. Today, you invoke this access by blaring a siren and looking like an emergency vehicle. In this world, every vehicle can have a signal it can broadcast to declare it's priority level.

In fact, we can have many tiers of priority available. Perhaps you can invoke faster routing for a price if you're late to work, or the opposite if you're road tripping and don't mind going slower to save some cost. Tiers for parcel deliveries, food deliveries, temperature-sensetive deliveries; all sorts of logistical context we can broadcast across vehicles.

## Predictive Fleet Rebalancing

Super Bowl in Seattle this weekend? Drain 10% of Portland's autonomous fleet, send them north proactively, have them sit idle running inference workloads until demand spikes.

Multi-region load balancing based on:

- Scheduled events (concerts, sports, conferences)
- Historical patterns (Friday night bar districts)
- Real-time demand signals
- Weather patterns affecting demand

## Higher Speed Baselines

Current highway speed limits (60-70 mph) exist partly for efficiency, partly for safety. If accidents become 100x less common through perfect coordination and reaction times, why not bump speeds to 90+ mph on major routes?

With V2V communication and perfect spacing, you could even create express lanes that run faster with tighter following distances.

## New Vehicle Form Factors

Once you remove the requirement for human operation, vehicle design opens up dramatically:

Sleepers: Long-haul overnight trips in room sized accomodations. If the NYC team is headed to SF for the company offsite, they can travel together in a sleeper car and work during the day in a mobile conference room. Actually, that's insane, don't do that.

True RVs: Buy a fully autonomous RV, live in it full-time, work remotely, never stop moving. Or, just have it drive between cities at night and wake up somewhere new every day. This is also on my list of specific wants.

## Natural Language Vehicle Interface

All of this—config service, fleet orchestration, annotations, emergency systems—needs to be controllable through natural conversation:

- "Take me home, but avoid the highway, I want to see the sunset over the water"
- "Follow my other car to the storage unit, then both vehicles return home"
- "My daughter can use the car to visit her friend Emma, but she needs to be home by 9 PM"
- "I'm having chest pains, get me to the nearest ER with cardiac specialists, use emergency priority"

The car becomes an AI assistant that understands context, preferences, and complex instructions. Computer use LLMs have come a long way in just the last year, this step would actually be quite easy.

## Open Source Autonomous Platforms

Most of these feaatures are fairly basic CRUD apps on top of the product of "a vehicle you can send from point A to point B." However, we know that just because something can be built, does not mean it will be. So, to really spur development on these apps, we'd want an open source ecosystem for self driving vehicles.

In the LLM world, you can do way more on /r/localllama with LoRAs, fine-tuning, and self-hosting than you can with the GPT-5 API. You need access to a smaller, but good-enough base model to build really novel applications on top.

Same thing will need to happen with autonomous vehicles. To get there, we need open source self-driving stacks that let developers build on top of the base autonomy system. Maybe that's plug in upgrade kits, like what comma.ai is building. Maybe it's the top 15 auto companies all baking in self driving as a feature, and one of them exposes their API a little more than the rest.

There will be more regulation in self-made cars than in self-made virtual girlfriends. But once we get to that point, this list will really start blowing up with things none of us have thought of.

## The Dependency Graph

Some of these can happen in parallel. Some require others as dependencies. I offer no year-by-year predictions; I have lost plenty of money on tesla call options looking for that.

I often think about how my children will not get their driver's licenses, and they'll think it was completely insane that we humans were manually operating cars back in the day. I believe that's true, but probably doesn't even go far enough; it's more likely that "cars" will have dissapered into the invisible plumbing of the earth, like phone lines. I won't miss them.
