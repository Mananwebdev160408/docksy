"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal as TerminalIcon,
  Layout,
  Monitor,
  Globe,
  Cpu,
  Calendar,
  Lock,
  Settings,
  Shield,
  ArrowRight,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play,
  CheckCircle2,
  Database,
  Sparkles,
  Server,
  Eye,
  FileText,
  Check,
} from "lucide-react";

export default function Home() {
  const [activeSection, setActiveSection] = useState("hero");
  const [layoutState, setLayoutState] = useState<
    "chaos" | "restoring" | "ordered"
  >("chaos");
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<
    "capture" | "restore" | "schedule"
  >("capture");
  const [simulatorStatus, setSimulatorStatus] = useState<
    "idle" | "capturing" | "restoring" | "success"
  >("idle");
  const [capturedWorkspaces, setCapturedWorkspaces] = useState<
    Array<{ name: string; time: string; count: number }>
  >([
    { name: "Frontend Development", time: "2 mins ago", count: 8 },
    { name: "Production Debugging", time: "1 hour ago", count: 12 },
    { name: "Daily Standup Routine", time: "Yesterday", count: 4 },
  ]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [activeConsoleTab, setActiveConsoleTab] = useState<
    "setup" | "build" | "logs"
  >("setup");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // Mouse coordinate tracking for Bento spotlight glows
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  // Intersection observer to track active section for the Left Dock
  useEffect(() => {
    const sections = [
      "hero",
      "simulator",
      "features",
      "architecture",
      "console",
      "specs",
      "faq",
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-45% 0px -45% 0px", // Trigger when center of viewport hits
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Chaotic layout state automatic loop (just to invite interaction)
  useEffect(() => {
    if (layoutState === "ordered") {
      const timer = setTimeout(() => {
        // Option to reset after some time? Let user control it
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [layoutState]);

  // Simulate restore workspace from Hero Section
  const handleHeroRestore = () => {
    if (layoutState === "ordered") {
      setLayoutState("chaos");
      return;
    }
    setLayoutState("restoring");
    setTimeout(() => {
      setLayoutState("ordered");
    }, 1500);
  };

  // Simulate dashboard capture/restore actions
  const triggerSimulatorAction = (action: "capture" | "restore") => {
    if (simulatorStatus !== "idle") return;

    if (action === "capture") {
      setSimulatorStatus("capturing");
      setTimeout(() => {
        const newName =
          newWorkspaceName.trim() ||
          `Workspace Snapshot #${capturedWorkspaces.length + 1}`;
        setCapturedWorkspaces([
          {
            name: newName,
            time: "Just now",
            count: Math.floor(Math.random() * 6) + 4,
          },
          ...capturedWorkspaces,
        ]);
        setNewWorkspaceName("");
        setSimulatorStatus("success");
        setTimeout(() => setSimulatorStatus("idle"), 2000);
      }, 1800);
    } else {
      setSimulatorStatus("restoring");
      setTimeout(() => {
        setSimulatorStatus("success");
        setTimeout(() => setSimulatorStatus("idle"), 2000);
      }, 2000);
    }
  };

  // Direct download handler simulating speed
  const startDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadProgress !== null) return;
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setDownloadProgress(null), 1500);

          // Trigger file download
          const link = document.createElement("a");
          link.href =
            "https://github.com/Mananwebdev160408/docksy/releases/latest/download/Docksy.Setup.1.0.2.exe";
          link.download = "Docksy.Setup.1.0.2.exe";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative grid-bg-overlay">
      <div className="absolute inset-0 ambient-glow pointer-events-none z-0" />

      {/* Floating Navigation Dock */}
      <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center py-6 px-4 bg-black/60 backdrop-blur-xl border border-white/5 rounded-3xl gap-8 dock-glow max-h-[85vh]">
        {/* App Logo */}
        <a
          href="#hero"
          className="group relative flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300"
        >
          <motion.div
            animate={{ rotate: layoutState === "ordered" ? 360 : 0 }}
            transition={{ duration: 1 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1f62ff"
              strokeWidth="2.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M9 3v18" />
              <path d="M3 9h6" />
              <path d="M14 9h7" />
              <path d="M14 15h7" />
            </svg>
          </motion.div>
          <span className="absolute left-16 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
            Docksy Core
          </span>
        </a>

        {/* Separator */}
        <div className="w-8 h-[1px] bg-white/5" />

        {/* Section Navigation */}
        <div className="flex flex-col gap-5">
          {[
            {
              id: "hero",
              label: "Dashboard",
              icon: <Layout className="w-4 h-4" />,
            },
            {
              id: "simulator",
              label: "Interactive Demo",
              icon: <Monitor className="w-4 h-4" />,
            },
            {
              id: "features",
              label: "Core Mechanics",
              icon: <Sparkles className="w-4 h-4" />,
            },
            {
              id: "architecture",
              label: "Architecture",
              icon: <Server className="w-4 h-4" />,
            },
            {
              id: "console",
              label: "CLI Setup",
              icon: <TerminalIcon className="w-4 h-4" />,
            },
            {
              id: "specs",
              label: "Performance",
              icon: <Cpu className="w-4 h-4" />,
            },
            {
              id: "faq",
              label: "Support & FAQ",
              icon: <Lock className="w-4 h-4" />,
            },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`group relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 ${
                activeSection === item.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white/5 text-zinc-400 border-white/5 hover:text-white hover:bg-white/10 hover:border-white/10"
              }`}
            >
              {item.icon}
              <span className="absolute left-16 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
                {item.label}
              </span>
            </a>
          ))}
        </div>

        {/* Separator */}
        <div className="w-8 h-[1px] bg-white/5" />

        {/* Action Utilities */}
        <div className="flex flex-col gap-4">
          <a
            href="#"
            onClick={startDownload}
            className="group relative flex items-center justify-center w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200"
          >
            {downloadProgress !== null ? (
              <span className="text-[10px] font-mono font-bold">
                {downloadProgress}%
              </span>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="absolute left-16 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
              Download Installer (.exe)
            </span>
          </a>

          <a
            href="https://github.com/Mananwebdev160408/docksy"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center w-10 h-10 bg-white/5 border border-white/5 text-zinc-400 rounded-xl hover:text-white hover:bg-white/10 hover:border-white/10 transition-all duration-200"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span className="absolute left-16 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
              Inspect Source Code
            </span>
          </a>
        </div>
      </nav>

      {/* Floating Bottom Nav for Mobile viewports */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex lg:hidden items-center justify-between p-2.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl w-[90%] max-w-[400px] dock-glow">
        <a
          href="#hero"
          className="flex items-center justify-center p-2 rounded-xl text-primary bg-primary/10"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M9 3v18" />
          </svg>
        </a>
        <div className="flex items-center gap-1.5">
          {[
            { id: "simulator", icon: <Monitor className="w-4 h-4" /> },
            { id: "features", icon: <Sparkles className="w-4 h-4" /> },
            { id: "architecture", icon: <Server className="w-4 h-4" /> },
            { id: "console", icon: <TerminalIcon className="w-4 h-4" /> },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`p-2 rounded-lg border transition-all duration-150 ${
                activeSection === item.id
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-transparent border-transparent text-zinc-400"
              }`}
            >
              {item.icon}
            </a>
          ))}
        </div>
        <a
          href="#"
          onClick={startDownload}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-all duration-200"
        >
          <Download className="w-3.5 h-3.5" />
          Get Exe
        </a>
      </div>

      {/* Main content flow */}
      <main className="flex-1 flex flex-col items-center z-10 w-full pl-0 lg:pl-28 pr-0">
        {/* SECTION 1: HERO */}
        <section
          id="hero"
          className="min-h-screen w-full flex flex-col justify-center items-center py-16 px-6 relative overflow-hidden"
        >
          {/* Simulated chaotic windows cluster */}
          <div className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center">
            <div className="w-[1200px] h-[800px] relative">
              <AnimatePresence>
                {/* 1. IDE mockup window */}
                <motion.div
                  key="ide-mockup"
                  className="absolute bg-zinc-950/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 flex flex-col"
                  style={{ transformOrigin: "center" }}
                  animate={
                    layoutState === "chaos"
                      ? {
                          top: "12%",
                          left: "4%",
                          width: "420px",
                          height: "300px",
                          rotate: -5,
                          scale: 0.9,
                        }
                      : layoutState === "restoring"
                        ? {
                            top: "18%",
                            left: "10%",
                            width: "520px",
                            height: "340px",
                            rotate: -1,
                            scale: 0.95,
                          }
                        : {
                            top: "10%",
                            left: "6%",
                            width: "620px",
                            height: "420px",
                            rotate: 0,
                            scale: 1,
                          }
                  }
                  transition={{ type: "spring", stiffness: 70, damping: 15 }}
                >
                  <div className="bg-zinc-900 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      <span className="text-[10px] text-zinc-500 font-mono ml-2">
                        vscode://workspace/docksy-api
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 font-mono text-xs text-zinc-400 select-none overflow-hidden space-y-1.5">
                    <p className="text-zinc-600">
                      // capturing environment snapshot...
                    </p>
                    <p>
                      <span className="text-purple-400">const</span> docksy ={" "}
                      <span className="text-yellow-400">require</span>(
                      <span className="text-green-300">"docksy-node"</span>);
                    </p>
                    <p>
                      <span className="text-purple-400">const</span> windows ={" "}
                      <span className="text-purple-400">await</span> docksy.
                      <span className="text-blue-400">getOpenWindows</span>();
                    </p>
                    <p className="text-zinc-500">{"{"}</p>
                    <p className="pl-4">
                      engine:{" "}
                      <span className="text-amber-400">"win32-python"</span>,
                    </p>
                    <p className="pl-4">
                      captureSpeed:{" "}
                      <span className="text-emerald-400">"142ms"</span>,
                    </p>
                    <p className="pl-4">
                      monitors: <span className="text-purple-400">2</span>
                    </p>
                    <p className="text-zinc-500">{"}"}</p>
                  </div>
                </motion.div>

                {/* 2. Web Browser mockup window */}
                <motion.div
                  key="browser-mockup"
                  className="absolute bg-zinc-950/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-30 flex flex-col"
                  animate={
                    layoutState === "chaos"
                      ? {
                          top: "45%",
                          right: "3%",
                          width: "400px",
                          height: "260px",
                          rotate: 7,
                          scale: 0.9,
                        }
                      : layoutState === "restoring"
                        ? {
                            top: "25%",
                            right: "8%",
                            width: "460px",
                            height: "300px",
                            rotate: 2,
                            scale: 0.95,
                          }
                        : {
                            top: "10%",
                            right: "6%",
                            width: "480px",
                            height: "340px",
                            rotate: 0,
                            scale: 1,
                          }
                  }
                  transition={{ type: "spring", stiffness: 65, damping: 14 }}
                >
                  <div className="bg-zinc-900 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                      <div className="bg-zinc-950 text-[10px] text-zinc-400 font-mono px-3 py-0.5 rounded border border-white/5 flex-1 mx-2 flex items-center justify-between">
                        <span>localhost:3000/docs/restorer</span>
                        <RefreshCw className="w-2.5 h-2.5 text-zinc-500 animate-spin-slow" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center items-center select-none bg-zinc-950">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center mb-3">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-200">
                      Localhost Workspace
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">
                      Synced with Docksy browser client socket
                    </span>
                  </div>
                </motion.div>

                {/* 3. Database Client mockup window */}
                <motion.div
                  key="db-mockup"
                  className="absolute bg-zinc-950/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 flex flex-col"
                  animate={
                    layoutState === "chaos"
                      ? {
                          bottom: "10%",
                          left: "15%",
                          width: "350px",
                          height: "220px",
                          rotate: -12,
                          scale: 0.85,
                        }
                      : layoutState === "restoring"
                        ? {
                            bottom: "15%",
                            right: "12%",
                            width: "420px",
                            height: "260px",
                            rotate: -3,
                            scale: 0.95,
                          }
                        : {
                            bottom: "10%",
                            right: "6%",
                            width: "480px",
                            height: "280px",
                            rotate: 0,
                            scale: 1,
                          }
                  }
                  transition={{ type: "spring", stiffness: 80, damping: 16 }}
                >
                  <div className="bg-zinc-900 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] text-zinc-400 font-mono">
                        SQLite: docksy_snapshots.db
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex-1 overflow-hidden font-mono text-[10px] text-zinc-400 space-y-1 select-none">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-500">
                          <th className="pb-1.5">snapshot_id</th>
                          <th className="pb-1.5">app_name</th>
                          <th className="pb-1.5">x_pos</th>
                          <th className="pb-1.5">y_pos</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5">
                          <td className="py-1">s01_t</td>
                          <td className="text-zinc-200">chrome.exe</td>
                          <td>1024</td>
                          <td>0</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-1">s02_t</td>
                          <td className="text-zinc-200">code.exe</td>
                          <td>0</td>
                          <td>0</td>
                        </tr>
                        <tr>
                          <td className="py-1">s03_t</td>
                          <td className="text-zinc-200">spotify.exe</td>
                          <td>2560</td>
                          <td>720</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* 4. Terminal Mockup window */}
                <motion.div
                  key="terminal-mockup"
                  className="absolute bg-zinc-950/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 flex flex-col"
                  animate={
                    layoutState === "chaos"
                      ? {
                          bottom: "14%",
                          right: "20%",
                          width: "360px",
                          height: "200px",
                          rotate: 8,
                          scale: 0.9,
                        }
                      : layoutState === "restoring"
                        ? {
                            bottom: "15%",
                            left: "10%",
                            width: "520px",
                            height: "240px",
                            rotate: -1,
                            scale: 0.95,
                          }
                        : {
                            bottom: "10%",
                            left: "6%",
                            width: "620px",
                            height: "280px",
                            rotate: 0,
                            scale: 1,
                          }
                  }
                  transition={{ type: "spring", stiffness: 75, damping: 15 }}
                >
                  <div className="bg-zinc-900 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TerminalIcon className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] text-zinc-400 font-mono">
                        PowerShell
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex-1 font-mono text-[11px] text-zinc-300 space-y-1 select-none overflow-hidden">
                    <p className="text-zinc-500">
                      Windows PowerShell (C) Microsoft Corporation.
                    </p>
                    <p>&gt; python engine.py --restore s01_t</p>
                    <p className="text-blue-400">
                      [info] Connection established with Electron Socket Client.
                    </p>
                    <p className="text-yellow-500">
                      [engine] Parsing 3 active win32 application targets...
                    </p>
                    <p className="text-emerald-400">
                      [success] Restored code.exe bounds (1920x1080) on Monitor
                      1.
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Hero Typography & Core CTA */}
          <div className="max-w-3xl text-center z-40 flex flex-col items-center justify-center select-none pt-24 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-full mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sleek Local-First Workspace Restore</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.08] mb-6"
            >
              Organize your desktop. <br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Restored in 1-Click.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-zinc-400 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-10"
            >
              Docksy automates your Windows workspace. Save running
              applications, monitor coordinates, size placements, and open
              browser tabs. Instantly rebuild state.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 z-50"
            >
              <button
                onClick={handleHeroRestore}
                className="group flex items-center justify-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer text-sm"
              >
                <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-all duration-200" />
                <span>
                  {layoutState === "ordered"
                    ? "Reset Workspace Layout"
                    : "Trigger Restore Simulator"}
                </span>
              </button>

              <a
                href="#console"
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 border border-white/5 hover:border-white/15 text-zinc-300 font-semibold rounded-2xl hover:bg-zinc-800/80 transition-all duration-300 text-sm"
              >
                <span>Read CLI Setup</span>
                <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-all duration-200" />
              </a>
            </motion.div>
          </div>

          <div className="absolute bottom-8 flex flex-col items-center text-zinc-500 select-none animate-bounce">
            <span className="text-[10px] font-mono tracking-widest uppercase">
              Scroll to explore
            </span>
            <ChevronDown className="w-4 h-4 mt-1" />
          </div>
        </section>

        {/* SECTION 2: WORKSPACE SIMULATOR */}
        <section
          id="simulator"
          className="w-full max-w-6xl py-24 px-6 snap-section"
        >
          <div className="text-center mb-12">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">
              Engine Simulation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Docksy Interface Showcase
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto mt-2">
              Interact with our workspace dashboard simulator below. See how
              easily snapshots are compiled and restored.
            </p>
          </div>

          {/* Client Dashboard Mockup Wrapper */}
          <div className="w-full bg-[#0c0d10] border border-white/5 rounded-2xl overflow-hidden shadow-2xl dock-glow">
            {/* Window control bar */}
            <div className="bg-zinc-900/60 px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs text-zinc-400 font-mono font-medium">
                  Docksy Restorer Client v1.0.2
                </span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] text-zinc-500 font-mono">
                  ENGINE ONLINE
                </span>
              </div>
            </div>

            {/* Dashboard Workspace */}
            <div className="flex flex-col md:flex-row min-h-[460px]">
              {/* Dashboard Sidebar */}
              <div className="w-full md:w-56 bg-zinc-950/40 p-4 border-r border-white/5 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-[10px] font-mono text-zinc-600 tracking-wider uppercase block">
                    Menu
                  </span>
                  <div className="space-y-1">
                    {[
                      {
                        key: "capture",
                        label: "New Snapshot",
                        icon: <Layout className="w-4 h-4" />,
                      },
                      {
                        key: "restore",
                        label: "Saved Snapshots",
                        icon: <Database className="w-4 h-4" />,
                      },
                      {
                        key: "schedule",
                        label: "Scheduler Config",
                        icon: <Calendar className="w-4 h-4" />,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveSimulatorTab(tab.key as any)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          activeSimulatorTab === tab.key
                            ? "bg-primary/10 border border-primary/20 text-primary"
                            : "bg-transparent border border-transparent text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center gap-3 text-zinc-500">
                  <Settings className="w-4 h-4" />
                  <span className="text-[10px] font-mono">SYSTEM SETTINGS</span>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between bg-zinc-950/20">
                <AnimatePresence mode="wait">
                  {/* Tab content: Capture Snapshot */}
                  {activeSimulatorTab === "capture" && (
                    <motion.div
                      key="capture-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-6 flex-1 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-bold text-white">
                            Capture Active Workspace
                          </h3>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm">
                          Docksy queries active Win32 bounds and browser
                          instances, storing layout coordinate vectors directly
                          into SQLite.
                        </p>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase">
                            Snapshot Label
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. VS Code Stack + Database Manager"
                            value={newWorkspaceName}
                            onChange={(e) =>
                              setNewWorkspaceName(e.target.value)
                            }
                            disabled={simulatorStatus === "capturing"}
                            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 text-white placeholder-zinc-600 transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-6">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {simulatorStatus === "capturing"
                            ? "Querying Win32 APIs..."
                            : "Ready to execute"}
                        </span>
                        <button
                          onClick={() => triggerSimulatorAction("capture")}
                          disabled={simulatorStatus !== "idle"}
                          className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all duration-200"
                        >
                          {simulatorStatus === "capturing" ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : simulatorStatus === "success" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Layout className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {simulatorStatus === "capturing"
                              ? "Capturing State"
                              : simulatorStatus === "success"
                                ? "Captured Successfully"
                                : "Execute Capture"}
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Tab content: Saved Snapshots */}
                  {activeSimulatorTab === "restore" && (
                    <motion.div
                      key="restore-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-6 flex-1 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-bold text-white">
                            Local Snapshot Ledger
                          </h3>
                        </div>
                        <p className="text-zinc-400 text-xs">
                          Restore open workspaces from the local index ledger.
                        </p>

                        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2">
                          {capturedWorkspaces.map((ws, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 bg-zinc-900 border border-white/5 rounded-xl hover:border-white/10 transition-all duration-200"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-200">
                                  {ws.name}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                  {ws.count} application targets • {ws.time}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  triggerSimulatorAction("restore")
                                }
                                disabled={simulatorStatus !== "idle"}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 text-zinc-300 hover:text-white hover:bg-white/10 text-[10px] font-bold rounded-lg transition-all duration-150"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Restore</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-6">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {simulatorStatus === "restoring"
                            ? "Arranging layouts..."
                            : "Ready"}
                        </span>
                        {simulatorStatus === "restoring" && (
                          <div className="flex items-center gap-2 text-primary font-mono text-xs">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Moving application processes...</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Tab content: Scheduler */}
                  {activeSimulatorTab === "schedule" && (
                    <motion.div
                      key="schedule-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-6 flex-1 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-bold text-white">
                            Scheduled Automation
                          </h3>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm">
                          Configure layout restores triggered automatically at
                          specific hours, calendars events, or PC boot events.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-zinc-200">
                                On Boot Restoration
                              </span>
                              <span className="text-[9px] text-zinc-500 mt-0.5">
                                Launches default stack on startup
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked
                              className="accent-primary"
                            />
                          </div>

                          <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-zinc-200">
                                Scheduled Trigger
                              </span>
                              <span className="text-[9px] text-zinc-500 mt-0.5">
                                Trigger standard stack at 09:00 AM
                              </span>
                            </div>
                            <input type="checkbox" className="accent-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-6 text-[10px] text-zinc-500 font-mono">
                        <span>
                          Restores mapped strictly locally via cron service
                        </span>
                        <span className="text-primary font-bold">
                          SCHEDULER STATUS: ACTIVE
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: BENTO GRID FEATURES */}
        <section
          id="features"
          className="w-full max-w-6xl py-24 px-6 snap-section"
        >
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">
              Engine Specs
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Docksy Core Architecture
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto mt-2">
              A comprehensive system overview of the engineering layers behind
              workspace restore workflows.
            </p>
          </div>

          {/* Bento layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1: Window Bounds Restorer */}
            <div
              onMouseMove={handleMouseMove}
              className="bento-card md:col-span-2 p-8 rounded-2xl flex flex-col justify-between group h-[300px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-all duration-300">
                  <Layout className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono border border-white/5 px-2.5 py-1 rounded bg-zinc-950">
                  WIN32 API
                </span>
              </div>
              <div className="space-y-2 mt-6">
                <h3 className="text-lg font-bold text-white">
                  Advanced Win32 Bounds Parser
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md">
                  Calculates exact screen display vectors, resolution scaling
                  configurations, minimized/maximized layout settings, and
                  cross-monitor positions.
                </p>
              </div>
            </div>

            {/* Bento Card 2: Browser Sync */}
            <div
              onMouseMove={handleMouseMove}
              className="bento-card p-8 rounded-2xl flex flex-col justify-between group h-[300px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-zinc-800/40 rounded-xl border border-white/5 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-all duration-300">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono border border-white/5 px-2.5 py-1 rounded bg-zinc-950">
                  SOCKETS
                </span>
              </div>
              <div className="space-y-2 mt-6">
                <h3 className="text-lg font-bold text-white">
                  Browser Tab Syncer
                </h3>
                <p className="text-zinc-400 text-xs">
                  Restores active tab stacks, window URL queues, and histories
                  inside Chrome and Edge sessions via Manifest V3 socket sync.
                </p>
              </div>
            </div>

            {/* Bento Card 3: SQLite Ledger */}
            <div
              onMouseMove={handleMouseMove}
              className="bento-card p-8 rounded-2xl flex flex-col justify-between group h-[300px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-zinc-800/40 rounded-xl border border-white/5 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-all duration-300">
                  <Database className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono border border-white/5 px-2.5 py-1 rounded bg-zinc-950">
                  SQLITE
                </span>
              </div>
              <div className="space-y-2 mt-6">
                <h3 className="text-lg font-bold text-white">
                  100% Offline Database
                </h3>
                <p className="text-zinc-400 text-xs">
                  Your coordinates, URL buffers, and app configs save directly
                  into a lightweight, secure offline SQLite ledger. Zero cloud
                  dependency.
                </p>
              </div>
            </div>

            {/* Bento Card 4: Virtual Desktops */}
            <div
              onMouseMove={handleMouseMove}
              className="bento-card md:col-span-2 p-8 rounded-2xl flex flex-col justify-between group h-[300px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-zinc-800/40 rounded-xl border border-white/5 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-all duration-300">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono border border-white/5 px-2.5 py-1 rounded bg-zinc-950">
                  WINDOWS API
                </span>
              </div>
              <div className="space-y-2 mt-6">
                <h3 className="text-lg font-bold text-white">
                  Native Virtual Desktops
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md">
                  Leverages Windows Virtual Desktop configurations. Restored
                  applications return precisely to their assigned desktops,
                  avoiding messy overlaps.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: ARCHITECTURE DIAGRAM */}
        <section
          id="architecture"
          className="w-full max-w-6xl py-24 px-6 snap-section"
        >
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">
              Process Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Docksy Engine Architecture
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto mt-2">
              Hover over the architecture layers to visualize how data flows
              during a snapshot or restore operation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-[#0c0d10] border border-white/5 rounded-2xl p-8 sm:p-12 dock-glow">
            {/* Interactive Visualizer Map */}
            <div className="lg:col-span-2 flex flex-col justify-center gap-6">
              {[
                {
                  id: "ui",
                  title: "1. Electron Client Interface",
                  desc: "React dashboard executing user restore prompts, handling schedules, and reading database status.",
                  color: "border-primary text-primary",
                },
                {
                  id: "python",
                  title: "2. Win32 Python Sidecar Engine",
                  desc: "Direct OS wrapper that invokes user32.dll and shell32.dll APIs to configure exact process sizes.",
                  color: "border-purple-500 text-purple-400",
                },
                {
                  id: "chrome",
                  title: "3. Browser Socket Service",
                  desc: "Listens to active tab logs via Chrome extension websockets to synchronize URL sessions.",
                  color: "border-amber-500 text-amber-400",
                },
              ].map((node) => (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer ${
                    hoveredNode === node.id
                      ? `${node.color} bg-white/5 scale-[1.02] shadow-lg`
                      : "border-white/5 bg-zinc-950/40 text-zinc-300 hover:border-white/15"
                  }`}
                >
                  <h4 className="text-sm font-bold">{node.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{node.desc}</p>
                </div>
              ))}
            </div>

            {/* Simulated Live Diagram Output */}
            <div className="flex flex-col justify-between h-full bg-zinc-950 p-6 rounded-xl border border-white/5 min-h-[300px]">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                  Engine Socket Logs
                </span>
                <div className="mt-4 space-y-3 font-mono text-[11px] text-zinc-400">
                  <AnimatePresence mode="wait">
                    {hoveredNode === "ui" && (
                      <motion.div
                        key="ui-log"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1.5"
                      >
                        <p className="text-primary">
                          [UI] Click captured on restore btn
                        </p>
                        <p>[UI] Sending process array request...</p>
                        <p className="text-zinc-600">// IPC channel ready</p>
                      </motion.div>
                    )}
                    {hoveredNode === "python" && (
                      <motion.div
                        key="python-log"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1.5"
                      >
                        <p className="text-purple-400">
                          [Win32] Executing shell command
                        </p>
                        <p>[Win32] Querying window descriptors...</p>
                        <p className="text-zinc-600">
                          &gt; user32.SetWindowPos(hwnd, ...)
                        </p>
                      </motion.div>
                    )}
                    {hoveredNode === "chrome" && (
                      <motion.div
                        key="chrome-log"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1.5"
                      >
                        <p className="text-amber-400">
                          [Socket] Client connected on :5175
                        </p>
                        <p>[Socket] Pulling active window URLs...</p>
                        <p className="text-zinc-600">
                          [Chrome] 4 tabs cataloged
                        </p>
                      </motion.div>
                    )}
                    {!hoveredNode && (
                      <motion.div
                        key="default-log"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-zinc-600 space-y-1.5"
                      >
                        <p>// Hover over left modules</p>
                        <p>// to trace process pipelines...</p>
                        <p className="text-emerald-500/80">
                          [Ready] Pipeline idling
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                <span>IPC SOCKET PROTOCOL</span>
                <span className="text-zinc-400 font-bold">RESTFUL</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: INTERACTIVE CONSOLE / INSTALL PLAYGROUND */}
        <section
          id="console"
          className="w-full max-w-6xl py-24 px-6 snap-section"
        >
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">
              Installation Workspace
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              CLI Build Playground
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto mt-2">
              Review setup processes or compile Docksy modules locally using our
              console preview.
            </p>
          </div>

          <div className="w-full bg-[#0c0d10] border border-white/5 rounded-2xl overflow-hidden shadow-2xl dock-glow">
            {/* Console Control Bar */}
            <div className="bg-zinc-900/60 px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  cmd.exe / powershell
                </span>
              </div>
              <div className="flex items-center gap-2">
                {["setup", "build", "logs"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveConsoleTab(tab as any)}
                    className={`px-3 py-1 rounded text-[10px] font-mono uppercase transition-all duration-200 ${
                      activeConsoleTab === tab
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-transparent text-zinc-500 border border-transparent hover:text-zinc-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Console Terminal Screen */}
            <div className="p-6 bg-zinc-950 min-h-[250px] font-mono text-xs text-zinc-300 flex flex-col justify-between">
              <div className="space-y-2">
                <AnimatePresence mode="wait">
                  {activeConsoleTab === "setup" && (
                    <motion.div
                      key="cli-setup"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-1.5"
                    >
                      <p className="text-zinc-500">
                        # Install dependencies inside web marketing client
                      </p>
                      <p>&gt; npm install docksy-restorer --save</p>
                      <p className="text-zinc-400">added 18 packages in 4.2s</p>
                      <p>&gt; npm run register-extension</p>
                      <p className="text-emerald-400">
                        ✓ Browser socket connection listening on localhost:5175
                      </p>
                    </motion.div>
                  )}

                  {activeConsoleTab === "build" && (
                    <motion.div
                      key="cli-build"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-1.5"
                    >
                      <p className="text-zinc-500">
                        # Building Electron client distribution bundles
                      </p>
                      <p>&gt; npm run package</p>
                      <p>Building React frontend... completed.</p>
                      <p>Compiling python sidecar process... completed.</p>
                      <p className="text-emerald-400">
                        ✓ Created file: dist-packaged/Docksy.Setup.1.0.2.exe
                        (~45MB)
                      </p>
                    </motion.div>
                  )}

                  {activeConsoleTab === "logs" && (
                    <motion.div
                      key="cli-logs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-1.5"
                    >
                      <p className="text-zinc-500">
                        # Standard engine operation execution logs
                      </p>
                      <p>[info] SQLite database engine mounted successfully.</p>
                      <p>[info] Scanning coordinates mapping database...</p>
                      <p className="text-blue-400">
                        [socket] Active browser extension socket active.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Install and Repo Quick Actions */}
              <div className="border-t border-white/5 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white">
                    Docksy.Setup.1.0.2.exe
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">
                    Windows 10 / 11 • SQLite Core • ~45MB
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <a
                    href="#"
                    onClick={startDownload}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all duration-200"
                  >
                    {downloadProgress !== null ? (
                      <span className="text-[11px] font-bold">
                        Downloading {downloadProgress}%
                      </span>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Get Setup Wizard</span>
                      </>
                    )}
                  </a>
                  <a
                    href="https://github.com/Mananwebdev160408/docksy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 border border-white/5 hover:border-white/10 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    <span>View GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: TECHNICAL SPECS & COMPARISON */}
        <section
          id="specs"
          className="w-full max-w-6xl py-24 px-6 snap-section"
        >
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">
              Metrics
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Technical Execution Specs
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto mt-2">
              Performance diagnostics outlining speed latencies and local
              hardware allocation constraints.
            </p>
          </div>

          <div className="w-full bg-[#0c0d10] border border-white/5 rounded-2xl overflow-hidden shadow-2xl dock-glow p-6 sm:p-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 font-mono text-[10px] uppercase">
                    <th className="pb-4">Core Metric</th>
                    <th className="pb-4">Docksy Engine</th>
                    <th className="pb-4">Standard SaaS Clients</th>
                    <th className="pb-4">System Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300">
                  <tr>
                    <td className="py-4 font-bold text-white">
                      Capture Latency
                    </td>
                    <td className="py-4 text-emerald-400 font-mono">150ms</td>
                    <td className="py-4 text-zinc-500 font-mono">
                      &gt;1.5s (Cloud sync)
                    </td>
                    <td className="py-4 text-zinc-500">Negligible</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-bold text-white">
                      Restore Execution
                    </td>
                    <td className="py-4 text-emerald-400 font-mono">1.2s</td>
                    <td className="py-4 text-zinc-500 font-mono">
                      Manual launch
                    </td>
                    <td className="py-4 text-zinc-500">Low process overhead</td>
                  </tr>
                  <tr>
                    <td className="py-4 font-bold text-white">
                      Data Storage Location
                    </td>
                    <td className="py-4 text-emerald-400 font-mono">
                      SQLite (Strictly Offline)
                    </td>
                    <td className="py-4 text-zinc-500 font-mono">
                      External Cloud Host
                    </td>
                    <td className="py-4 text-zinc-500">
                      Zero data exit safety
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 font-bold text-white">
                      Process RAM Footprint
                    </td>
                    <td className="py-4 text-emerald-400 font-mono">
                      &lt;45MB
                    </td>
                    <td className="py-4 text-zinc-500 font-mono">
                      &gt;280MB (Chrome tabs)
                    </td>
                    <td className="py-4 text-zinc-500">
                      Ultra-light background
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 7: DEVELOPER FAQ */}
        <section id="faq" className="w-full max-w-4xl py-24 px-6 snap-section">
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">
              Troubleshooting
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Developer FAQ
            </h2>
            <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto mt-2">
              Common integration issues and details regarding security
              architecture constraints.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Where is Docksy's snapshot database stored?",
                a: "Docksy stores all coordinate vectors, configuration settings, and browser tab logs inside a local SQLite database file at '%USERPROFILE%/.docksy/docksy.db'. This file never interacts with external host networks.",
              },
              {
                q: "How does Docksy handle multiple monitor setups?",
                a: "Our Win32 sidecar engine queries active monitor device descriptors. If you capture a layout on a multi-monitor layout, Docksy scales coordinate maps correctly when restoring to a single-monitor or different resolution layout.",
              },
              {
                q: "Are there any application permissions required?",
                a: "Docksy runs inside user-level space. It queries window placements using default Windows APIs. Some administrative software (like custom task managers) might restrict access unless Docksy client runs with Administrative rights.",
              },
              {
                q: "What browser configurations are supported?",
                a: "Chrome and Microsoft Edge are natively supported. Our Manifest V3 browser extension captures socket reports on active tabs, syncs layout positions, and restores tabs using a socket stream.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-[#0c0d10] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() =>
                    setFaqActiveIndex(faqActiveIndex === index ? null : index)
                  }
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer hover:bg-white/5 transition-all duration-200"
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  {faqActiveIndex === index ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {faqActiveIndex === index && (
                    <motion.div
                      key={`faq-content-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-6 pt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/5">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 8: FOOTER */}
        <footer className="w-full max-w-6xl py-12 px-6 border-t border-white/5 text-zinc-500 text-xs mt-24">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-1.5 text-center sm:text-left">
              <span className="font-bold text-white text-sm">
                Docksy — Windows Workspace Restorer
              </span>
              <span>MIT License • Build automated layouts locally.</span>
            </div>
            <div className="flex flex-col sm:flex-end items-center sm:items-end gap-3">
              <div className="flex items-center gap-6">
                <a
                  href="#features"
                  className="hover:text-white transition-all duration-150"
                >
                  Mechanics
                </a>
                <a
                  href="#console"
                  className="hover:text-white transition-all duration-150"
                >
                  Playground
                </a>
                <a
                  href="https://github.com/Mananwebdev160408/docksy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-all duration-150"
                >
                  GitHub Source
                </a>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-white/5 text-zinc-400 rounded-lg text-[10px] font-mono">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.101zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z" />
                </svg>
                <span>Win10 / Win11 Compatible</span>
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
