"use client";

import { useEffect, useState } from "react";

export const GREETINGS = {
  // 7:00am – 10:59am
  morning: [
    "Let's have a good day, shall we?",
    "Let's make today count!",
    "Good morning! Hope you're well rested.",
    "Fresh start, fresh goals.",
    "Morning! What's on today's agenda?",
    "Grab a coffee and let's get started."
  ] as string[],

  // 11:00am – 12:59pm 
  noon: [
    "Good noon! Time for a quick break.",
    "Taking a quick reset before lunch?",
    "Hope your day is off to a great start!",
    "Lunchtime soon? Keep up the momentum!",
    "Halfway through the day—you've got this.",
    "Ready to take on the second half of the day?"
  ] as string[], 

  // 1:00pm – 3:59pm
  afternoon: [
    "Good afternoon! Powering through?",
    "Hope your afternoon is going smoothly.",
    "Refueled and ready for action!",
    "Let's keep the momentum going!",
    "Almost there—finish the day strong!",
    "Afternoon check-in! Let's stay focused."
  ] as string[], 

  // 4:00pm – 10:59pm
  evening: [
    "Good evening! Time to wrap things up?",
    "Reflecting on a day well spent.",
    "Winding down or getting a second wind?",
    "Nice to see you this evening!",
    "Good evening! Make sure to relax soon.",
    "Time to wrap things up neatly!"
  ] as string[], 

  // 11:00pm – 4:59am
  lateNight: [
    "Burning the midnight oil?",
    "Working late? Remember to rest soon!",
    "The world is asleep, but you're in the zone.",
    "Night owl mode: activated.",
    "Late night hustle! Don't forget to sleep.",
    "Still up? Finish strong!"
  ] as string[], 

  // 5:00am – 6:59am
  earlyMorning: [
    "Up before the sun! Early bird mode on.",
    "Good early morning! You've got a head start.",
    "Beat the world to the punch!",
    "Rise and shine! A brand new day awaits.",
    "Early start today? Let's make it count.",
    "Morning! Coffee first, then let's get to work."
  ] as string[], 
};

function setFor(date: Date): string[] {
  const m = date.getHours() * 60 + date.getMinutes();
  if (m >= 7 * 60 && m < 11 * 60) return GREETINGS.morning;
  if (m >= 11 * 60 && m < 13 * 60) return GREETINGS.noon;
  if (m >= 13 * 60 && m < 16 * 60) return GREETINGS.afternoon;
  if (m >= 16 * 60 && m < 23 * 60) return GREETINGS.evening;
  if (m >= 5 * 60 && m < 7 * 60) return GREETINGS.earlyMorning;
  return GREETINGS.lateNight;
}

export function Greeting() {
  const [text, setText] = useState("");

  useEffect(() => {
    const set = setFor(new Date());
    setText(set.length ? set[Math.floor(Math.random() * set.length)] : "");
  }, []);

  if (!text) return null;
  return <p className="mt-5 text-center text-lg text-accent-3">{text}</p>;
}
