import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  FileText, 
  HelpCircle, 
  Languages, 
  Accessibility, 
  Clock, 
  AlertCircle,
  Printer,
  Download,
  Loader2,
  ChevronRight,
  Plus,
  X,
  Share2,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Book,
  ExternalLink,
  Search,
  Volume2,
  VolumeX,
  Eye,
  Type as TypeIcon,
  Copy,
  Check,
  Settings2,
  Zap,
  AlertTriangle,
  Star,
  MessageSquare,
  LogIn,
  LogOut,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';

import { InputData, OutputData, Mode } from './types';
import { generateEducationalMaterial, generateSpeech } from './services/aiService';
import { EXAMPLES, Example } from './examples';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  loginAnonymously,
  logout, 
  collection, 
  addDoc, 
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MODES: { value: Mode; label: string; icon: React.ReactNode }[] = [
  { value: 'lesson_plan', label: 'Lesson Plan', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'worksheet', label: 'Worksheet', icon: <FileText className="w-4 h-4" /> },
  { value: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-4 h-4" /> },
  { value: 'translate_only', label: 'Translate', icon: <Languages className="w-4 h-4" /> },
  { value: 'adapt_for_inclusion', label: 'Adapt for Inclusion', icon: <Accessibility className="w-4 h-4" /> },
];

const PDF_TEMPLATES = {
  modern: {
    name: 'Modern',
    fontFamily: "'Inter', sans-serif",
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    headerBg: '#f8fafc',
    borderRadius: '12px',
    spacing: '1.5em'
  },
  classic: {
    name: 'Classic',
    fontFamily: "'Georgia', serif",
    primaryColor: '#1a1a1a',
    accentColor: '#4b5563',
    backgroundColor: '#ffffff',
    textColor: '#111111',
    headerBg: '#ffffff',
    borderRadius: '0px',
    spacing: '1.2em'
  },
  academic: {
    name: 'Academic',
    fontFamily: "'Libre Baskerville', serif",
    primaryColor: '#000000',
    accentColor: '#000000',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    headerBg: '#ffffff',
    borderRadius: '0px',
    spacing: '1.4em'
  },
  professional: {
    name: 'Professional',
    fontFamily: "'Inter', sans-serif",
    primaryColor: '#0f172a',
    accentColor: '#334155',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    headerBg: '#f1f5f9',
    borderRadius: '8px',
    spacing: '1.6em'
  }
};

const LANGUAGES = ['English', 'Thai', 'Karen', 'Burmese'];

// Logo Component
const Logo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={cn("flex items-center justify-center", className)}>
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full text-brand"
    >
      {/* Lightbulb rays - 5 rays as seen in the image */}
      <rect x="47.5" y="8" width="5" height="12" rx="2.5" fill="currentColor" />
      <rect x="25" y="18" width="5" height="12" rx="2.5" transform="rotate(-45 25 18)" fill="currentColor" />
      <rect x="70" y="18" width="5" height="12" rx="2.5" transform="rotate(45 70 18)" fill="currentColor" />
      <rect x="12" y="45" width="12" height="5" rx="2.5" fill="currentColor" />
      <rect x="76" y="45" width="12" height="5" rx="2.5" fill="currentColor" />
      
      {/* Lightbulb body */}
      <path d="M50 18C41 18 33 26 33 36C33 42 36 47 41 50V56C41 57.1 41.9 58 43 58H57C58.1 58 59 57.1 59 56V50C64 47 67 42 67 36C67 26 59 18 50 18Z" fill="currentColor" />
      <path d="M45 60C45 62.2 47.2 64 50 64C52.8 64 55 62.2 55 60H45Z" fill="currentColor" />

      {/* Book - Two thick curved strokes as seen in the image */}
      <path d="M15 62C15 62 35 57 50 67C65 57 85 62 85 62V72C85 72 65 67 50 77C35 67 15 72 15 72V62Z" fill="currentColor" />
      <path d="M10 72C10 72 35 67 50 77C65 67 90 72 90 72V82C90 82 65 77 50 87C35 77 10 82 10 82V72Z" fill="currentColor" />
    </svg>
  </div>
);

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutputData | null>(null);
  const [formData, setFormData] = useState<InputData>(() => {
    const saved = localStorage.getItem('panya_form_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved form data', e);
      }
    }
    return {
      mode: 'lesson_plan',
      subject: '',
      topic: '',
      grade_level: '',
      languages: ['English'],
      learning_objectives: '',
      time_available_minutes: 60,
      constraints: '',
      adaptations: '',
      sensitive_topics: '',
    };
  });

  // Save to local storage whenever formData changes
  React.useEffect(() => {
    localStorage.setItem('panya_form_data', JSON.stringify(formData));
  }, [formData]);

  const clearForm = () => {
    const defaultData: InputData = {
      mode: 'lesson_plan',
      subject: '',
      topic: '',
      grade_level: '',
      languages: ['English'],
      learning_objectives: '',
      time_available_minutes: 60,
      constraints: '',
      adaptations: '',
      sensitive_topics: '',
    };
    setFormData(defaultData);
    localStorage.removeItem('panya_form_data');
  };

  const [pdfOptions, setPdfOptions] = useState({
    fontFamily: 'sans-serif',
    fontSize: '12pt',
    margin: '20mm',
    paperSize: 'a4',
    orientation: 'portrait',
    theme: 'modern',
    includeHeader: true,
    includeFooter: true,
    includeCoverPage: true,
    includeTableOfContents: true,
    showOptions: false
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [showExamples, setShowExamples] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<User | null>({
    uid: 'guest-user',
    displayName: 'Guest Teacher',
    email: 'guest@panya.ai',
    isAnonymous: true,
  } as any);
  const [authLoading, setAuthLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, comment: '', submitted: false, loading: false });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleListen = async (text: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setLoading(true);
      const url = await generateSpeech(text);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate speech. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    
    const shareData = {
      title: result.title,
      text: `Check out this inclusive educational material: ${result.title}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(window.location.href);
        }
      }
    } else {
      copyToClipboard(window.location.href);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageToggle = (lang: string) => {
    setFormData(prev => {
      const newLangs = prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang];
      return { ...prev, languages: newLangs.length > 0 ? newLangs : [lang] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback({ rating: 0, comment: '', submitted: false, loading: false });
    try {
      const data = await generateEducationalMaterial(formData);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!result) return;
    
    try {
      const theme = PDF_TEMPLATES[pdfOptions.theme as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.modern;
      const rawHtml = await marked.parse(result.printable_markdown);
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${result.title}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
                
                body { 
                  font-family: ${pdfOptions.fontFamily === 'serif' ? (pdfOptions.theme === 'academic' ? "'Libre Baskerville', serif" : "'Lora', serif") : pdfOptions.fontFamily === 'monospace' ? "'JetBrains Mono', monospace" : theme.fontFamily};
                  padding: ${pdfOptions.margin}; 
                  line-height: 1.6; 
                  color: ${theme.textColor};
                  max-width: 800px;
                  margin: 0 auto;
                  background: ${theme.backgroundColor};
                }
                
                h1 { 
                  font-size: 2.6em; 
                  font-weight: 800; 
                  margin-bottom: 0.6em; 
                  color: ${theme.primaryColor}; 
                  line-height: 1.1;
                  letter-spacing: -0.03em;
                }
                
                h2 { 
                  font-size: 1.8em; 
                  font-weight: 700; 
                  margin-top: 1.8em; 
                  margin-bottom: 0.8em; 
                  color: ${theme.textColor};
                  border-left: 6px solid ${theme.primaryColor};
                  padding-left: 20px;
                  background: ${theme.headerBg};
                  padding-top: 12px;
                  padding-bottom: 12px;
                }
                
                h3 { 
                  font-size: 1.4em; 
                  font-weight: 700; 
                  margin-top: 1.6em; 
                  margin-bottom: 0.6em; 
                  color: ${theme.accentColor};
                }
                
                p { margin-bottom: ${theme.spacing}; }
                
                ul, ol { margin-bottom: ${theme.spacing}; padding-left: 1.8em; }
                li { margin-bottom: 0.6em; }
                
                blockquote {
                  margin: 2em 0;
                  padding: 1em 1.5em;
                  background: ${theme.headerBg};
                  border-left: 4px solid ${theme.primaryColor};
                  color: ${theme.textColor};
                  font-style: italic;
                  border-radius: 0 ${theme.borderRadius} ${theme.borderRadius} 0;
                }
                
                pre {
                  background: #0f172a;
                  color: #f8fafc;
                  padding: 1.2em;
                  border-radius: ${theme.borderRadius};
                  overflow-x: auto;
                  margin: 1.5em 0;
                  font-family: 'JetBrains Mono', monospace;
                }
                
                code {
                  background: ${theme.headerBg};
                  padding: 0.2em 0.4em;
                  border-radius: 4px;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 0.9em;
                  color: ${theme.accentColor};
                }
                
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.5em 0;
                  border-radius: ${theme.borderRadius};
                  overflow: hidden;
                }
                
                th, td {
                  padding: 0.8em;
                  border: 1px solid #e2e8f0;
                  text-align: left;
                }
                
                th {
                  background: ${theme.primaryColor};
                  color: white;
                  font-weight: 700;
                }
                
                @media print {
                  body { padding: 20px; }
                  button { display: none; }
                }
              </style>
            </head>
            <body>
              <div id="content">${cleanHtml}</div>
              <script>
                window.onload = () => {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Print Error:', err);
      setError('Failed to prepare document for printing.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setIsGeneratingPDF(true);
    
    // Create a toast-like notification for PDF preparation
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300';
    toast.innerHTML = `
      <svg class="w-5 h-5 animate-spin text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      <span class="text-sm font-semibold">Preparing high-quality PDF...</span>
    `;
    document.body.appendChild(toast);
    
    try {
      const isLandscape = pdfOptions.orientation === 'landscape';
      const paperSize = pdfOptions.paperSize;
      
      // Ensure fonts are loaded
      await document.fonts.ready;
      
      // Create a temporary container for PDF generation
      const element = document.createElement('div');
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = isLandscape ? '297mm' : '210mm';
      element.className = 'pdf-export-container';
      document.body.appendChild(element);
      
      // Advanced styling for the PDF
      const theme = PDF_TEMPLATES[pdfOptions.theme as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.modern;

      const styles = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
          
          .pdf-export-container {
            font-family: ${pdfOptions.fontFamily === 'serif' ? (pdfOptions.theme === 'academic' ? "'Libre Baskerville', serif" : "'Lora', serif") : pdfOptions.fontFamily === 'monospace' ? "'JetBrains Mono', monospace" : theme.fontFamily};
            color: ${theme.textColor};
            line-height: 1.6;
            padding: 0;
            background: ${theme.backgroundColor};
            width: 100%;
          }
          
          .pdf-page {
            padding: ${pdfOptions.margin};
            position: relative;
            background: ${theme.backgroundColor};
            min-height: ${isLandscape ? '210mm' : '297mm'};
            box-sizing: border-box;
          }

          .cover-page {
            display: ${pdfOptions.includeCoverPage ? 'flex' : 'none'};
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            height: ${isLandscape ? '210mm' : '297mm'};
            padding: 40mm 20mm;
            background: ${theme.primaryColor};
            color: white;
            page-break-after: always;
          }

          .cover-title {
            font-size: 48pt;
            font-weight: 800;
            margin-bottom: 20px;
            line-height: 1.1;
          }

          .cover-subtitle {
            font-size: 18pt;
            opacity: 0.9;
            margin-bottom: 60px;
          }

          .cover-meta {
            font-size: 12pt;
            opacity: 0.8;
            margin-top: auto;
            border-top: 1px solid rgba(255,255,255,0.3);
            padding-top: 30px;
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .pdf-header {
            display: ${pdfOptions.includeHeader ? 'flex' : 'none'};
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid ${theme.primaryColor};
          }

          .pdf-header-title {
            font-size: 10px;
            font-weight: 800;
            color: ${theme.textColor};
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .pdf-header-brand {
            font-size: 10px;
            font-weight: 800;
            color: ${theme.primaryColor};
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          
          .pdf-content {
            font-size: ${pdfOptions.fontSize};
          }
          
          h1 { 
            font-size: 2.6em; 
            font-weight: 800; 
            margin-bottom: 0.6em; 
            color: ${theme.primaryColor}; 
            line-height: 1.1;
            letter-spacing: -0.03em;
          }
          
          h2 { 
            font-size: 1.8em; 
            font-weight: 700; 
            margin-top: 1.8em; 
            margin-bottom: 0.8em; 
            color: ${theme.textColor};
            border-left: 6px solid ${theme.primaryColor};
            padding-left: 20px;
            background: ${theme.headerBg};
            padding-top: 12px;
            padding-bottom: 12px;
            page-break-after: avoid;
          }
          
          h3 { 
            font-size: 1.4em; 
            font-weight: 700; 
            margin-top: 1.6em; 
            margin-bottom: 0.6em; 
            color: ${theme.accentColor};
            page-break-after: avoid;
          }
          
          p { margin-bottom: ${theme.spacing}; }
          
          ul, ol { margin-bottom: ${theme.spacing}; padding-left: 1.8em; }
          li { margin-bottom: 0.6em; }
          
          blockquote {
            margin: 2em 0;
            padding: 1.5em 2em;
            background: ${theme.headerBg};
            border-left: 6px solid ${theme.primaryColor};
            color: ${theme.textColor};
            font-style: italic;
            border-radius: 0 ${theme.borderRadius} ${theme.borderRadius} 0;
            page-break-inside: avoid;
          }
          
          pre {
            background: #0f172a;
            color: #f8fafc;
            padding: 1.5em;
            border-radius: ${theme.borderRadius};
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85em;
            margin: 2em 0;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            page-break-inside: avoid;
          }
          
          code {
            background: ${theme.headerBg};
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9em;
            color: ${theme.accentColor};
            font-weight: 600;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 2em 0;
            border-radius: ${theme.borderRadius};
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            page-break-inside: avoid;
          }
          
          th, td {
            padding: 1.2em;
            border: 1px solid #e2e8f0;
            text-align: left;
          }
          
          th {
            background: ${theme.primaryColor};
            font-weight: 800;
            color: white;
            text-transform: uppercase;
            font-size: 0.75em;
            letter-spacing: 0.1em;
          }

          tr:nth-child(even) {
            background: ${theme.headerBg};
          }
          
          .pdf-footer {
            display: ${pdfOptions.includeFooter ? 'flex' : 'none'};
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            justify-content: space-between;
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .toc-section {
            display: ${pdfOptions.includeTableOfContents ? 'block' : 'none'};
            margin-bottom: 40px;
            padding: 30px;
            background: ${theme.headerBg};
            border-radius: ${theme.borderRadius};
            page-break-after: always;
          }

          .toc-title {
            font-size: 1.5em;
            font-weight: 800;
            margin-bottom: 20px;
            color: ${theme.primaryColor};
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .toc-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px dotted #cbd5e1;
            padding-bottom: 5px;
          }

          /* Page break handling */
          .page-break {
            page-break-before: always;
          }
          
          @media print {
            h1, h2, h3 { page-break-after: avoid; }
            img, table, pre, blockquote { page-break-inside: avoid; }
          }
        </style>
      `;
      
      // Parse markdown to HTML
      const rawHtml = await marked.parse(result.printable_markdown);
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      
      // Extract headings for TOC
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHtml;
      const headings = Array.from(tempDiv.querySelectorAll('h2')).map(h => h.textContent);

      element.innerHTML = `
        ${styles}
        <div class="cover-page">
          <div class="cover-title">${result.title}</div>
          <div class="cover-subtitle">${result.mode.replace('_', ' ').toUpperCase()}</div>
          <div class="cover-meta">
            <div><strong>Subject:</strong> ${result.subject}</div>
            <div><strong>Grade:</strong> ${result.grade_level}</div>
            <div><strong>Topic:</strong> ${result.topic}</div>
            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="pdf-page">
          <div class="toc-section">
            <div class="toc-title">Table of Contents</div>
            ${headings.map(h => `
              <div class="toc-item">
                <span>${h}</span>
              </div>
            `).join('')}
          </div>

          <div class="pdf-header">
            <span class="pdf-header-title">${result.title}</span>
            <span class="pdf-header-brand">Panya AI Assistant</span>
          </div>
          <div class="pdf-metadata" style="margin-bottom: 20px; padding: 15px; background: ${theme.headerBg}; border-radius: ${theme.borderRadius}; font-size: 0.9em; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border: 1px solid #e2e8f0;">
            <div><strong>Subject:</strong> ${result.subject}</div>
            <div><strong>Topic:</strong> ${result.topic}</div>
            <div><strong>Grade:</strong> ${result.grade_level}</div>
            <div><strong>Languages:</strong> ${result.languages.join(', ')}</div>
          </div>
          <div class="pdf-content">
            ${cleanHtml}
          </div>
          <div class="pdf-footer">
            <span>Generated on ${new Date().toLocaleDateString()} • Inclusive Education</span>
            <span class="pdf-page-number"></span>
          </div>
        </div>
      `;
      
      const getWindowWidth = () => {
        const dpi = 96;
        const mmToInch = 25.4;
        const sizes = {
          a4: { w: 210, h: 297 },
          letter: { w: 215.9, h: 279.4 },
          legal: { w: 215.9, h: 355.6 }
        };
        const size = sizes[paperSize as keyof typeof sizes] || sizes.a4;
        const widthMm = isLandscape ? size.h : size.w;
        return Math.round((widthMm / mmToInch) * dpi);
      };

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const opt = {
        margin: 0,
        filename: `${result.title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true, 
          logging: false,
          windowWidth: getWindowWidth()
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: paperSize, 
          orientation: pdfOptions.orientation as 'portrait' | 'landscape',
          compress: true,
          precision: 2
        },
        pagebreak: { mode: ['avoid-all' as const, 'css' as const, 'legacy' as const] }
      };
      
      // Generate PDF with page numbers
      const worker = html2pdf().set(opt).from(element).toPdf().get('pdf');
      
      await (worker as any).then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const startPage = pdfOptions.includeCoverPage ? 2 : 1;
        
        for (let i = startPage; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(9);
          pdf.setTextColor(150);
          const pageText = `Page ${pdfOptions.includeCoverPage ? i - 1 : i} of ${pdfOptions.includeCoverPage ? totalPages - 1 : totalPages}`;
          const x = pdf.internal.pageSize.getWidth() / 2;
          const y = pdf.internal.pageSize.getHeight() - 10;
          pdf.text(pageText, x, y, { align: 'center' });
        }
      });
      
      await (worker as any).save();
      
      // Success feedback
      toast.innerHTML = `
        <svg class="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="text-sm font-semibold">Download started!</span>
      `;
      setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);

    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setError('Failed to generate high-quality PDF. Please try using the "Print" option instead.');
      if (toast.parentNode) document.body.removeChild(toast);
    } finally {
      const tempElement = document.querySelector('.pdf-export-container');
      if (tempElement) {
        document.body.removeChild(tempElement);
      }
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadInputPDF = async () => {
    setIsGeneratingPDF(true);
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300';
    toast.innerHTML = `
      <svg class="w-5 h-5 animate-spin text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      <span class="text-sm font-semibold">Preparing draft PDF...</span>
    `;
    document.body.appendChild(toast);

    try {
      await document.fonts.ready;
      const element = document.createElement('div');
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '210mm';
      element.className = 'pdf-export-container';
      document.body.appendChild(element);

      const theme = PDF_TEMPLATES[pdfOptions.theme as keyof typeof PDF_TEMPLATES] || PDF_TEMPLATES.modern;
      const styles = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
          .pdf-export-container {
            font-family: ${theme.fontFamily};
            color: ${theme.textColor};
            line-height: 1.6;
            padding: 0;
            background: ${theme.backgroundColor};
            width: 100%;
          }
          .pdf-page { padding: 20mm; position: relative; background: ${theme.backgroundColor}; }
          .pdf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid ${theme.primaryColor}; }
          .pdf-header-title { font-size: 10px; font-weight: 800; color: ${theme.textColor}; text-transform: uppercase; letter-spacing: 0.1em; }
          .pdf-header-brand { font-size: 10px; font-weight: 800; color: ${theme.primaryColor}; text-transform: uppercase; letter-spacing: 0.1em; }
          h1 { font-size: 2.4em; font-weight: 800; margin-bottom: 0.6em; color: ${theme.primaryColor}; }
          .draft-section { margin-bottom: 20px; }
          .draft-label { font-size: 10px; font-weight: 800; color: ${theme.accentColor}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .draft-value { font-size: 14px; color: ${theme.textColor}; background: ${theme.headerBg}; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
        </style>
      `;

      element.innerHTML = `
        ${styles}
        <div class="pdf-page">
          <div class="pdf-header">
            <span class="pdf-header-title">Material Draft</span>
            <span class="pdf-header-brand">Panya AI Assistant</span>
          </div>
          <h1>${formData.topic || 'Untitled Topic'}</h1>
          <div class="draft-section">
            <div class="draft-label">Subject</div>
            <div class="draft-value">${formData.subject || 'Not specified'}</div>
          </div>
          <div class="draft-section">
            <div class="draft-label">Grade Level</div>
            <div class="draft-value">${formData.grade_level || 'Not specified'}</div>
          </div>
          <div class="draft-section">
            <div class="draft-label">Languages</div>
            <div class="draft-value">${formData.languages.join(', ')}</div>
          </div>
          <div class="draft-section">
            <div class="draft-label">Learning Objectives</div>
            <div class="draft-value">${formData.learning_objectives || 'Not specified'}</div>
          </div>
          ${formData.adaptations ? `
            <div class="draft-section">
              <div class="draft-label">Inclusion Needs</div>
              <div class="draft-value">${formData.adaptations}</div>
            </div>
          ` : ''}
          ${formData.sensitive_topics ? `
            <div class="draft-section">
              <div class="draft-label">Sensitive Topics</div>
              <div class="draft-value">${formData.sensitive_topics}</div>
            </div>
          ` : ''}
        </div>
      `;

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const opt = {
        margin: 0,
        filename: `Draft_${formData.topic.replace(/\s+/g, '_') || 'Material'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const, compress: true, precision: 2 }
      };
      
      await html2pdf().set(opt).from(element).save();
      toast.innerHTML = `
        <svg class="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="text-sm font-semibold">Draft exported!</span>
      `;
      setTimeout(() => {
        toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    } catch (err) {
      console.error('Draft PDF Error:', err);
      if (toast.parentNode) document.body.removeChild(toast);
    } finally {
      const tempElement = document.querySelector('.pdf-export-container');
      if (tempElement) document.body.removeChild(tempElement);
      setIsGeneratingPDF(false);
    }
  };

  const submitFeedback = async () => {
    if (!user || feedback.rating === 0) return;
    
    setFeedback(prev => ({ ...prev, loading: true }));
    try {
      await addDoc(collection(db, 'feedback'), {
        rating: feedback.rating,
        comment: feedback.comment,
        materialTitle: result?.title || 'Unknown',
        inputData: formData,
        timestamp: serverTimestamp(),
        userId: user.uid
      });
      setFeedback(prev => ({ ...prev, submitted: true, loading: false }));
    } catch (err) {
      setFeedback(prev => ({ ...prev, loading: false }));
      handleFirestoreError(err, OperationType.CREATE, 'feedback');
    }
  };

  const handleEmailLogin = async (email: string) => {
    try {
      setAuthLoading(true);
      await loginAnonymously(email);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to login with Google');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // No-op
  };

  const applyExample = (example: Example) => {
    setFormData(example.data);
    setShowExamples(false);
    setResult(null);
    setError(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">Panya AI</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inclusive Education Assistant</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setShowExamples(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-brand transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Examples</span>
            </button>
            <button 
              onClick={clearForm}
              className="coursera-btn-secondary py-2 px-6 text-sm hidden sm:block"
            >
              New Material
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Form Section */}
          <div className="lg:col-span-4">
            <div className="sticky top-32">
              <div className="coursera-card p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand/10 rounded-lg">
                        <Settings2 className="w-5 h-5 text-brand" />
                      </div>
                      <h2 className="text-lg font-bold">Configuration</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadInputPDF}
                        disabled={isGeneratingPDF}
                        className="text-[10px] font-bold text-slate-400 hover:text-brand uppercase tracking-widest transition-colors flex items-center gap-1"
                        title="Export input draft to PDF"
                      >
                        <Download className="w-3 h-3" />
                        Draft
                      </button>
                      <button
                        type="button"
                        onClick={clearForm}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                  </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Mode Selection */}
                  <div>
                    <label className="label-text">Material Type</label>
                    <div className="grid grid-cols-1 gap-2">
                      {MODES.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, mode: mode.value }))}
                          className={cn(
                            "group flex items-center gap-4 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-left",
                            formData.mode === mode.value
                              ? "bg-brand/5 border-brand text-brand shadow-sm"
                              : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            formData.mode === mode.value ? "bg-brand text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                          )}>
                            {mode.icon}
                          </div>
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-text">Subject</label>
                        <input
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          placeholder="e.g. Science"
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-text">Grade</label>
                        <input
                          type="text"
                          name="grade_level"
                          value={formData.grade_level}
                          onChange={handleInputChange}
                          placeholder="e.g. 4"
                          className="input-field"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label-text">Topic</label>
                      <input
                        type="text"
                        name="topic"
                        value={formData.topic}
                        onChange={handleInputChange}
                        placeholder="e.g. Water Cycle"
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="label-text">Target Languages</label>
                    <div className="flex flex-wrap gap-1.5">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleLanguageToggle(lang)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                            formData.languages.includes(lang)
                              ? "bg-brand border-brand text-white"
                              : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <label className="label-text">Learning Objectives</label>
                    <textarea
                      name="learning_objectives"
                      value={formData.learning_objectives}
                      onChange={handleInputChange}
                      placeholder="What should students learn?"
                      rows={3}
                      className="input-field resize-none"
                      required
                    />
                  </div>

                  {/* Adaptations */}
                  <div>
                    <label className="label-text">Inclusion Needs (Optional)</label>
                    <textarea
                      name="adaptations"
                      value={formData.adaptations}
                      onChange={handleInputChange}
                      placeholder="e.g. Autism, low vision..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>

                  {/* Sensitive Topics */}
                  <div>
                    <label className="label-text">Sensitive Topics (Optional)</label>
                    <textarea
                      name="sensitive_topics"
                      value={formData.sensitive_topics}
                      onChange={handleInputChange}
                      placeholder="e.g. Violence, trauma, difficult history..."
                      rows={2}
                      className="input-field resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">AI will flag these and provide teacher advisories.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="coursera-btn-primary w-full shadow-lg shadow-brand/20 py-4"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5" />
                        <span>Create Material</span>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!result && !loading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-8 sm:p-16 bg-white rounded-3xl border-2 border-dashed border-slate-200"
                >
                  <div className="w-20 h-20 bg-brand/5 rounded-2xl flex items-center justify-center text-brand mb-8 rotate-3">
                    <BookOpen className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-slate-900 mb-4">Ready to create?</h3>
                  <p className="text-slate-500 max-w-sm mx-auto leading-relaxed mb-10">
                    Fill out the configuration to generate high-quality, inclusive teaching materials.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
                    {[
                      { icon: <Languages className="w-4 h-4" />, label: "Multilingual" },
                      { icon: <Accessibility className="w-4 h-4" />, label: "Inclusive" },
                      { icon: <Zap className="w-4 h-4" />, label: "Instant" }
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
                        <div className="text-brand">{item.icon}</div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[600px] flex flex-col items-center justify-center p-8 sm:p-16 bg-white rounded-3xl border border-slate-200"
                >
                  <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-brand/10 border-t-brand rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-brand animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">Crafting Material</h3>
                  <p className="text-slate-500 text-center max-w-xs">
                    Our AI is crafting inclusive content and translations for your classroom...
                  </p>
                  <div className="mt-8 w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 15, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 sm:p-12 bg-white border-2 border-red-100 rounded-3xl shadow-xl shadow-red-900/5 flex flex-col items-center text-center"
                >
                  <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-6 -rotate-3">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-slate-900 mb-3">Something went wrong</h3>
                  <p className="text-slate-600 max-w-md leading-relaxed mb-8">
                    {error}
                  </p>
                  
                  <div className="w-full max-w-sm bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Troubleshooting</h4>
                    <ul className="space-y-3">
                      <li className="flex gap-3 text-xs text-slate-600 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        {error.includes('PDF') ? 'Try using the "Print" option instead.' : 'Check your connection and try again.'}
                      </li>
                      <li className="flex gap-3 text-xs text-slate-600 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        {error.includes('SAFETY') ? 'Try more neutral language in your topic.' : 'Refresh the page if the issue persists.'}
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                    <button 
                      onClick={() => setError(null)}
                      className="coursera-btn-primary flex-1 py-3 text-sm"
                    >
                      Dismiss
                    </button>
                    {!error.includes('PDF') && (
                      <button 
                        onClick={() => handleSubmit(new Event('submit') as any)}
                        className="coursera-btn-secondary flex-1 py-3 text-sm"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8 pb-20"
                >
                  {/* Result Header - Improved */}
                  <div className="bg-white rounded-[32px] p-8 sm:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                    
                    <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-8">
                      <div className="flex-1 space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="px-4 py-1.5 bg-brand text-white text-[10px] font-bold uppercase rounded-full tracking-widest shadow-lg shadow-brand/20">
                            {result.mode.replace('_', ' ')}
                          </span>
                          <span className="px-4 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full tracking-widest border border-slate-200">
                            {result.grade_level}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            {result.subject}
                          </span>
                        </div>
                        
                        <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 font-display leading-[1.1] tracking-tight max-w-2xl">
                          {result.title}
                        </h2>

                        <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
                          <div className="flex -space-x-2">
                            {result.languages.map((lang, i) => (
                              <div key={lang} className={cn(
                                "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
                                i === 0 ? "bg-indigo-500" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-rose-500"
                              )}>
                                {lang[0]}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {result.languages.length} {result.languages.length === 1 ? 'Language' : 'Languages'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <button
                          onClick={() => copyToClipboard(result.printable_markdown)}
                          className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-all duration-300 group shadow-sm"
                          title="Copy Markdown"
                        >
                          {copied ? <Check className="w-5 h-5 text-emerald-500 group-hover:text-white" /> : <Copy className="w-5 h-5" />}
                        </button>
                        
                        <button
                          onClick={handleShare}
                          className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-brand hover:text-white hover:border-brand transition-all duration-300 shadow-sm"
                          title="Share"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setPdfOptions(prev => ({ ...prev, showOptions: !prev.showOptions }))}
                            className={cn(
                              "h-12 px-6 rounded-2xl flex items-center gap-3 font-bold text-sm transition-all duration-300 shadow-sm",
                              pdfOptions.showOptions 
                                ? "bg-brand text-white border-brand" 
                                : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                            )}
                            disabled={isGeneratingPDF}
                          >
                            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span>{isGeneratingPDF ? 'Preparing...' : 'Export PDF'}</span>
                          </button>

                          <AnimatePresence>
                            {pdfOptions.showOptions && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-4 w-80 bg-white rounded-[32px] shadow-2xl border border-slate-100 p-8 z-30"
                              >
                                <div className="space-y-6">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold text-slate-900 font-display">PDF Settings</h4>
                                    <button 
                                      onClick={() => setPdfOptions(prev => ({ ...prev, showOptions: false }))}
                                      className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                                    >
                                      <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                  </div>

                                  <div className="space-y-6">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Visual Theme</label>
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { label: 'Modern', value: 'modern' },
                                          { label: 'Classic', value: 'classic' },
                                          { label: 'Academic', value: 'academic' },
                                          { label: 'Professional', value: 'professional' }
                                        ].map(t => (
                                          <button
                                            key={t.value}
                                            onClick={() => setPdfOptions(prev => ({ ...prev, theme: t.value }))}
                                            className={cn(
                                              "py-2 rounded-xl text-[10px] font-bold border-2 transition-all",
                                              pdfOptions.theme === t.value 
                                                ? "bg-brand/5 border-brand text-brand" 
                                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                            )}
                                          >
                                            {t.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <label className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-slate-200 cursor-pointer transition-all">
                                        <input 
                                          type="checkbox" 
                                          checked={pdfOptions.includeCoverPage}
                                          onChange={(e) => setPdfOptions(prev => ({ ...prev, includeCoverPage: e.target.checked }))}
                                          className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                                        />
                                        <span className="text-[10px] font-bold uppercase text-slate-600">Cover Page</span>
                                      </label>
                                      <label className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 hover:border-slate-200 cursor-pointer transition-all">
                                        <input 
                                          type="checkbox" 
                                          checked={pdfOptions.includeTableOfContents}
                                          onChange={(e) => setPdfOptions(prev => ({ ...prev, includeTableOfContents: e.target.checked }))}
                                          className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                                        />
                                        <span className="text-[10px] font-bold uppercase text-slate-600">Table of Contents</span>
                                      </label>
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Typography</label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { label: 'Sans', value: 'sans-serif', icon: <TypeIcon className="w-4 h-4" /> },
                                          { label: 'Serif', value: 'serif', icon: <Book className="w-4 h-4" /> },
                                          { label: 'Mono', value: 'monospace', icon: <Settings2 className="w-4 h-4" /> }
                                        ].map(f => (
                                          <button
                                            key={f.value}
                                            onClick={() => setPdfOptions(prev => ({ ...prev, fontFamily: f.value }))}
                                            className={cn(
                                              "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                                              pdfOptions.fontFamily === f.value 
                                                ? "bg-brand/5 border-brand text-brand shadow-sm" 
                                                : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                            )}
                                          >
                                            {f.icon}
                                            <span className="text-[10px] font-bold uppercase">{f.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Size</label>
                                        <select 
                                          value={pdfOptions.fontSize}
                                          onChange={(e) => setPdfOptions(prev => ({ ...prev, fontSize: e.target.value }))}
                                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-brand/30"
                                        >
                                          <option value="10pt">Small</option>
                                          <option value="12pt">Medium</option>
                                          <option value="14pt">Large</option>
                                          <option value="16pt">X-Large</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Margins</label>
                                        <select 
                                          value={pdfOptions.margin}
                                          onChange={(e) => setPdfOptions(prev => ({ ...prev, margin: e.target.value }))}
                                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-3 text-xs font-bold outline-none focus:border-brand/30"
                                        >
                                          <option value="0mm">None</option>
                                          <option value="10mm">Narrow</option>
                                          <option value="20mm">Normal</option>
                                          <option value="30mm">Wide</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      handleDownloadPDF();
                                      setPdfOptions(prev => ({ ...prev, showOptions: false }));
                                    }}
                                    className="coursera-btn-primary w-full py-4 text-sm flex items-center justify-center gap-3 shadow-lg shadow-brand/20"
                                  >
                                    <Download className="w-5 h-5" />
                                    Generate PDF
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <button
                          onClick={handlePrint}
                          className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-900 flex items-center justify-center text-white hover:bg-slate-800 transition-all duration-300 shadow-sm"
                          title="Print Material"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Content Warnings */}
                  {result.content_warnings && result.content_warnings.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4"
                    >
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Content Advisory</h4>
                        <p className="text-amber-700 text-xs font-medium mb-3">
                          This material contains sensitive topics. Please review before classroom use.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.content_warnings.map((warning, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white/50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded-md">
                              {warning}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Metadata Bento Grid - Improved */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-200/20 hover:shadow-xl transition-shadow duration-300 group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                          <Languages className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Languages</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.languages.map(lang => (
                          <span key={lang} className="px-4 py-2 bg-indigo-50/50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-100">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-200/20 hover:shadow-xl transition-shadow duration-300 group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                          <Accessibility className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Accessibility</h4>
                      </div>
                      <div className="space-y-3">
                        {result.accessibility?.features.slice(0, 3).map((feat, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {feat.feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg shadow-slate-200/20 hover:shadow-xl transition-shadow duration-300 group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
                          <Lightbulb className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Teacher Tips</h4>
                      </div>
                      <div className="space-y-3">
                        {result.teacher_tips.slice(0, 2).map((tip, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs font-bold text-slate-600 italic">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            "{tip}"
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Inclusion Strategies */}
                  <div className="bg-brand/5 border border-brand/10 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-brand/10 rounded-xl text-brand">
                        <Accessibility className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-brand uppercase tracking-widest">
                        Inclusion Strategies
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.inclusion_strategies.map((strat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-brand/5 shadow-sm hover:shadow-md transition-all">
                          <div className="text-[10px] font-bold text-brand uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                            {strat.need}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{strat.strategy}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accessibility Features */}
                  {result.accessibility && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
                            <Accessibility className="w-5 h-5" />
                          </div>
                          <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-widest">
                            Accessibility Support
                          </h3>
                        </div>
                        <button
                          onClick={() => handleListen(result.printable_markdown)}
                          disabled={loading}
                          className={cn(
                            "flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all",
                            isPlaying 
                              ? "bg-red-50 text-red-600 border border-red-100" 
                              : "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 active:scale-95"
                          )}
                        >
                          {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          {isPlaying ? "Stop Listening" : "Listen to Material"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Features List */}
                        <div className="space-y-6">
                          <h4 className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Implemented Features
                          </h4>
                          <div className="space-y-4">
                            {result.accessibility.features.map((f, i) => (
                              <div key={i} className="flex gap-4 items-start group">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-150 transition-transform" />
                                <div>
                                  <div className="text-sm font-bold text-emerald-900">{f.feature}</div>
                                  <div className="text-xs text-emerald-600/70 font-medium leading-relaxed">{f.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Alt Text Suggestions */}
                        {result.accessibility.alt_text_suggestions.length > 0 && (
                          <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest flex items-center gap-2">
                              <Eye className="w-3.5 h-3.5" />
                              Image Alt Text
                            </h4>
                            <div className="space-y-3">
                              {result.accessibility.alt_text_suggestions.map((alt, i) => (
                                <div key={i} className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100/50 text-xs shadow-sm">
                                  <span className="font-bold text-emerald-700 block mb-1 uppercase tracking-wider text-[9px]">{alt.element}</span>
                                  <span className="text-emerald-900 font-medium italic leading-relaxed">"{alt.alt_text}"</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* TTS Guidelines */}
                      {result.accessibility.tts_guidelines.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-emerald-100/50">
                          <h4 className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest flex items-center gap-2 mb-6">
                            <TypeIcon className="w-3.5 h-3.5" />
                            Text-to-Speech Guidelines
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {result.accessibility.tts_guidelines.map((guideline, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-white/40 rounded-xl border border-emerald-100/30">
                                <div className="w-2 h-2 rounded-full bg-emerald-300" />
                                <span className="text-xs text-emerald-800 font-medium">{guideline}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Teacher Tips */}
                  <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 sm:p-12">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Teacher Implementation Tips</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {result.teacher_tips.map((tip, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:border-brand group-hover:text-brand transition-all shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed font-medium pt-1">
                            {tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Glossary */}
                  {result.glossary && result.glossary.length > 0 && (
                    <div className="coursera-card overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400">
                            <Book className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Glossary of Terms</h3>
                        </div>
                        <span className="px-3 py-1 bg-brand/5 text-brand text-[10px] font-bold uppercase rounded-full border border-brand/10">
                          {result.glossary.length} Terms
                        </span>
                      </div>
                      <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {result.glossary.map((item, i) => (
                            <div key={i} className="group p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-bold text-slate-900 group-hover:text-brand transition-colors">
                                  {item.term}
                                </h4>
                                {item.translation && (
                                  <span className="text-[10px] font-bold text-brand bg-brand/5 px-2 py-1 rounded-md border border-brand/10">
                                    {item.translation}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                {item.definition}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sources & Grounding */}
                  {result.sources && result.sources.length > 0 && (
                    <div className="coursera-card overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Sources & References</h3>
                        </div>
                        <span className="px-3 py-1 bg-brand/5 text-brand text-[10px] font-bold uppercase rounded-full border border-brand/10">
                          {result.sources.length} Links
                        </span>
                      </div>
                      <div className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {result.sources.map((source, i) => (
                            <a
                              key={i}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-brand/30 hover:bg-brand/5 transition-all group"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-brand/10 flex items-center justify-center shrink-0 transition-colors">
                                  <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-brand" />
                                </div>
                                <span className="text-sm font-bold text-slate-700 truncate group-hover:text-brand">
                                  {source.title}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand transform group-hover:translate-x-1 transition-all" />
                            </a>
                          ))}
                        </div>
                        <p className="mt-6 text-[10px] text-slate-400 flex items-center gap-2 font-bold uppercase tracking-widest">
                          <Search className="w-4 h-4" />
                          Information verified via Google Search
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Feedback Section */}
                  <div className="coursera-card overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400">
                          <Star className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Your Feedback</h3>
                      </div>
                    </div>
                    <div className="p-8">
                      {!user ? (
                        <div className="text-center py-6">
                          <p className="text-sm text-slate-500 mb-4">Please login to provide feedback and help us improve.</p>
                          <button 
                            onClick={signInWithGoogle}
                            className="coursera-btn-primary py-2 px-6 text-sm mx-auto flex items-center gap-2"
                          >
                            <LogIn className="w-4 h-4" />
                            Login with Google
                          </button>
                        </div>
                      ) : feedback.submitted ? (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-2">Thank you!</h4>
                          <p className="text-sm text-slate-500">Your feedback helps us make Panya AI better for teachers everywhere.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <label className="label-text mb-3 block">How would you rate this material?</label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                                  className={cn(
                                    "p-2 rounded-xl transition-all",
                                    feedback.rating >= star ? "text-amber-400 scale-110" : "text-slate-200 hover:text-slate-300"
                                  )}
                                >
                                  <Star className="w-8 h-8" fill={feedback.rating >= star ? "currentColor" : "none"} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="label-text mb-3 block">Any specific comments or suggestions?</label>
                            <textarea
                              value={feedback.comment}
                              onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                              placeholder="What did you like? What could be better?"
                              rows={3}
                              className="input-field resize-none"
                            />
                          </div>
                          <button
                            onClick={submitFeedback}
                            disabled={feedback.rating === 0 || feedback.loading}
                            className="coursera-btn-primary w-full py-3 flex items-center justify-center gap-2"
                          >
                            {feedback.loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MessageSquare className="w-4 h-4" />
                            )}
                            Submit Feedback
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Generated Content - Editorial Style */}
                  <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-brand" />
                    
                    <div className="p-8 sm:p-16 space-y-24">
                      {/* Primary Language */}
                      <div className="relative">
                        <div className="flex items-center gap-4 mb-16">
                          <div className="h-px flex-1 bg-slate-100" />
                          <span className="px-6 py-2 bg-brand/5 text-brand text-[10px] font-bold uppercase rounded-full border border-brand/10 tracking-[0.2em]">
                            Primary: {result.languages[0]}
                          </span>
                          <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <div className="space-y-20">
                          {result.content.primary_language.sections.map((section, i) => (
                            <div key={i} className="max-w-3xl mx-auto group">
                              <div className="flex items-start gap-8">
                                <span className="hidden md:block text-6xl font-display font-black text-slate-100 group-hover:text-brand/10 transition-colors select-none">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <div className="flex-1">
                                  <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8 font-display tracking-tight group-hover:text-brand transition-colors">
                                    {section.heading}
                                  </h3>
                                  <div className="prose prose-slate prose-lg max-w-none prose-p:leading-relaxed prose-p:text-slate-600 prose-strong:text-slate-900 prose-p:font-medium">
                                    <Markdown>{section.body}</Markdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mirrored Languages */}
                      {result.content.mirrored_languages.map((langContent, i) => (
                        <div key={i} className="relative pt-24 border-t border-slate-100">
                          <div className="flex items-center gap-4 mb-16">
                            <div className="h-px flex-1 bg-slate-100" />
                            <span className="px-6 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-full border border-indigo-100 tracking-[0.2em]">
                              Translation: {langContent.language}
                            </span>
                            <div className="h-px flex-1 bg-slate-100" />
                          </div>

                          <div className="space-y-20">
                            {langContent.sections.map((section, j) => (
                              <div key={j} className="max-w-3xl mx-auto group">
                                <div className="flex items-start gap-8">
                                  <span className="hidden md:block text-6xl font-display font-black text-slate-100 group-hover:text-indigo-100/10 transition-colors select-none">
                                    {String(j + 1).padStart(2, '0')}
                                  </span>
                                  <div className="flex-1">
                                    <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-8 font-display tracking-tight group-hover:text-indigo-600 transition-colors">
                                      {section.heading}
                                    </h3>
                                    <div className="prose prose-slate prose-lg max-w-none prose-p:leading-relaxed prose-p:text-slate-600 prose-strong:text-slate-900 prose-p:font-medium">
                                      <Markdown>{section.body}</Markdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Branding */}
                    <div className="bg-slate-50 border-t border-slate-100 p-12 flex flex-col items-center text-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-3xl border border-slate-200 flex items-center justify-center text-brand shadow-xl shadow-slate-200/50">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Handcrafted by Panya AI</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Inclusive Education Excellence</p>
                      </div>
                    </div>
                  </div>

                  {/* Self Check */}
                  <div className="bg-brand/5 border border-brand/10 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-brand/10">
                        <CheckCircle2 className="w-8 h-8 text-brand" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-brand uppercase tracking-widest mb-1">Quality Assurance Passed</div>
                        <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-md">{result.self_check.notes}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {result.self_check.met_inclusion && (
                        <span className="px-4 py-2 bg-white text-brand text-[10px] font-bold uppercase rounded-xl border border-brand/10 shadow-sm">
                          Inclusive Design
                        </span>
                      )}
                      {result.self_check.met_multilingual && (
                        <span className="px-4 py-2 bg-white text-indigo-600 text-[10px] font-bold uppercase rounded-xl border border-indigo-100 shadow-sm">
                          Multilingual Ready
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200 mt-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 opacity-30 grayscale" />
            <span className="text-lg font-bold text-slate-300">Panya AI</span>
          </div>
          <div className="text-sm text-slate-400 text-center md:text-right font-medium max-w-md">
            Empowering educators with AI-driven inclusive materials. 
            Supporting diverse learners across languages and needs.
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {isGeneratingPDF && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-100 rounded-full animate-pulse"></div>
                <Loader2 className="w-10 h-10 text-brand animate-spin absolute inset-0 m-auto" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Crafting Document</h3>
                <p className="text-sm text-slate-500 font-medium">
                  We're finalizing your high-quality educational document. This may take a few seconds...
                </p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                  className="bg-brand h-full"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Examples Modal */}
      <AnimatePresence>
        {showExamples && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExamples(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-brand text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Try an Example</h3>
                    <p className="text-blue-100 text-xs font-medium">Select a template to pre-fill the form</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExamples(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXAMPLES.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => applyExample(example)}
                      className="group p-6 rounded-2xl border border-slate-100 hover:border-brand/30 hover:bg-brand/5 text-left transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 bg-slate-100 group-hover:bg-brand/10 text-slate-500 group-hover:text-brand text-[10px] font-bold uppercase rounded-md tracking-widest transition-all">
                          {example.data.mode.replace('_', ' ')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand transform group-hover:translate-x-1 transition-all" />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-2">{example.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{example.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Panya AI • Inclusive Education Support
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
