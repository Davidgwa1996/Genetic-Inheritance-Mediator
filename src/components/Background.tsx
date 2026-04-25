import React from 'react';
import { motion } from 'motion/react';

const FloatingText = ({ text, duration, delay, className }: { text: string, duration: number, delay: number, className: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ 
      opacity: [0, 0.3, 0],
      x: [0, 100, -50, 0],
      y: [0, -50, 100, 0],
      rotate: [0, 10, -10, 0],
      scale: [0.8, 1.1, 0.9, 1]
    }}
    transition={{ 
      duration, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut"
    }}
    className={`absolute pointer-events-none select-none font-black tracking-tighter uppercase whitespace-nowrap ${className}`}
  >
    {text}
  </motion.div>
);

export const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#F8FAFC]">
      {/* Moving App Titles */}
      <FloatingText text="GIM" duration={25} delay={0} className="top-[15%] left-[20%] text-[15vw] text-blue-900/5" />
      <FloatingText text="Genetic" duration={30} delay={5} className="bottom-[20%] left-[10%] text-[10vw] text-indigo-900/5" />
      <FloatingText text="Mediator" duration={28} delay={2} className="top-[40%] right-[10%] text-[12vw] text-blue-900/5" />
      <FloatingText text="Inheritance" duration={35} delay={8} className="bottom-[10%] right-[20%] text-[8vw] text-indigo-900/5" />

      {/* Animated Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/40 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -80, 0],
          y: [0, 120, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] bg-indigo-100/30 blur-[100px] rounded-full"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 50, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-blue-50/50 blur-[110px] rounded-full"
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Dynamic DNA Elements (Abstract) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="w-[800px] h-[800px] border-[1px] border-blue-900 rounded-full"
        />
        <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
            className="absolute w-[600px] h-[600px] border-[1px] border-indigo-900 rounded-full"
        />
      </div>
    </div>
  );
};
