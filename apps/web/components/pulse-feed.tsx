"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "./providers";

interface PulseEvent {
  id: string;
  messageKey: keyof typeof MESSAGE_KEYS;
  location: string;
  timestamp: Date;
}

const LOCATIONS = [
  "Thohoyandou", "Harare", "Bulawayo", "Mutare", "Gweru",
  "Kwekwe", "Kadoma", "Masvingo", "Chinhoyi", "Marondera",
  "Beitbridge", "Victoria Falls", "Gwanda", "Bindura"
];

const MESSAGE_KEYS = {
  pulseNewMerchant: true,
  pulseSavingsGoal: true,
  pulseGrowthPayout: true,
  pulseMobileSettlement: true,
  pulseInsuranceActivated: true,
  pulseMicroLoanApproved: true,
  pulseTrustTierUpgraded: true,
  pulseQrPayment: true,
  pulseCashSaleRecorded: true
} as const;

const MESSAGE_LIST = Object.keys(MESSAGE_KEYS) as Array<keyof typeof MESSAGE_KEYS>;

export function PulseFeed() {
  const { translate } = useAppContext();
  const [events, setEvents] = useState<PulseEvent[]>([]);

  useEffect(() => {
    const initialEvents = Array.from({ length: 4 }).map(() => ({
      id: Math.random().toString(36).slice(2, 11),
      messageKey: MESSAGE_LIST[Math.floor(Math.random() * MESSAGE_LIST.length)],
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      timestamp: new Date()
    }));
    setEvents(initialEvents);

    const interval = setInterval(() => {
      const newEvent = {
        id: Math.random().toString(36).slice(2, 11),
        messageKey: MESSAGE_LIST[Math.floor(Math.random() * MESSAGE_LIST.length)],
        location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
        timestamp: new Date()
      };
      setEvents((prev) => [newEvent, ...prev.slice(0, 3)]);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">{translate("vakaPulseFeed")}</p>
      </div>
      <AnimatePresence mode="popLayout">
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/20 bg-white/50 p-3 shadow-sm backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold leading-tight text-ink">{translate(event.messageKey)}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{event.location}</span>
              <span className="text-[10px] text-slate-300">{translate("justNow")}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
