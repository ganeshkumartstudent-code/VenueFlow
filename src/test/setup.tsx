import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

type TestGlobal = typeof globalThis & {
  geminiMock: {
    generateContent: (payload: { contents: string; config?: Record<string, unknown> }) => Promise<{
      text: string;
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    }>;
  };
};

type ChildrenProps = {
  children?: React.ReactNode;
};

const testGlobal = globalThis as TestGlobal;
const geminiGenerateContent = vi.fn(async () => ({
  text: 'Mock AI Response',
  candidates: [{ content: { parts: [{ text: 'Mock AI Response' }] } }],
}));

// Global mock state for Gemini
testGlobal.geminiMock = {
  generateContent: geminiGenerateContent,
};

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: ChildrenProps) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: ChildrenProps) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  LineChart: ({ children }: ChildrenProps) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  AreaChart: ({ children }: ChildrenProps) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
}));

// Mock ScrollArea primitives to avoid async layout side-effects in unit tests
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="mock-scroll-area">{children}</div>
  ),
  ScrollBar: () => null,
}));

// Mock Google Maps React components for unit tests
vi.mock('@vis.gl/react-google-maps', () => ({
  ApiProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-api-provider">{children}</div>,
  Map: ({ children, onIdle }: { children?: React.ReactNode; onIdle?: () => void }) => {
    React.useEffect(() => {
      onIdle?.();
    }, [onIdle]);
    return <div data-testid="mock-map">{children}</div>;
  },
  Marker: () => <div data-testid="mock-marker" />,
  InfoWindow: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-info-window">{children}</div>,
  useMap: () => null,
  useMapsLibrary: (_library: string) => null,
}));

// Mock Google Generative AI
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: function() {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: testGlobal.geminiMock.generateContent,
        }),
        models: {
          generateContent: testGlobal.geminiMock.generateContent,
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
  collection: vi.fn((_db: unknown, path: string) => ({ path })),
  query: vi.fn((q) => q),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  doc: vi.fn((_db: unknown, coll: string, id: string) => ({ id, coll })),
  getDoc: vi.fn(),
  getDocs: vi.fn(() => ({ empty: true, docs: [] })),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(() => vi.fn(async (data: { prompt: string; systemInstruction?: string; config?: Record<string, unknown> }) => {
    const mock = testGlobal.geminiMock;
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
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  useReducedMotion: () => false,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Global window mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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
