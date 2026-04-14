import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Global mock state for Gemini
(globalThis as any).geminiMock = {
  generateContent: vi.fn().mockResolvedValue({
    text: 'Mock AI Response',
    candidates: [{ content: { parts: [{ text: 'Mock AI Response' }] } }]
  })
};

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
}));

// Mock Google Generative AI
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: function() {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: (globalThis as any).geminiMock.generateContent,
        }),
        models: {
          generateContent: (globalThis as any).geminiMock.generateContent,
        }
      };
    },
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
    },
    Modality: {
      AUDIO: 'AUDIO',
    }
  };
});

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((db, path) => ({ path })),
  query: vi.fn((q) => q),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  doc: vi.fn((db, coll, id) => ({ id, coll })),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => ({ empty: true, docs: [] })),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => vi.fn(async (data) => {
    const mock = (globalThis as any).geminiMock;
    // Map the Cloud Function call to the geminiMock for compatibility with existing tests
    const response = await mock.generateContent({
      contents: data.prompt,
      config: { ...data.config, systemInstruction: data.systemInstruction }
    });
    return { data: { text: response.text } };
  })),
}));

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Global window mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
