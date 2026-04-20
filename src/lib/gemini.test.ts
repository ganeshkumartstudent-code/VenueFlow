import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askGemini, getCrowdPrediction } from './gemini';

type TestGlobal = typeof globalThis & {
  geminiMock: {
    generateContent: ReturnType<typeof vi.fn>;
  };
};

// Use the global mock created in setup.tsx
const testGlobal = globalThis as TestGlobal;
const mockGenerateContent = testGlobal.geminiMock.generateContent;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('Gemini Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should send prompts to Gemini and return text responses', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'The shortest line is at Sector 4.',
    });

    const result = await askGemini('Where is the shortest line?');
    
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      contents: 'Where is the shortest line?'
    }));
    expect(result).toBe('The shortest line is at Sector 4.');
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Down'));
    
    const result = await askGemini('Hello');
    expect(result).toContain("trouble connecting");
  });

  it('should use custom system instructions if provided', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'Custom response' });
    
    await askGemini('Hello', 'You are a pirate.');
    
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        systemInstruction: 'You are a pirate.'
      })
    }));
  });

  it('should request and parse crowd predictions as JSON', async () => {
    const mockPrediction = {
      predictions: [
        { sectorId: 'S1', predictedDensity: 85, recommendation: 'Deploy more staff' }
      ]
    };
    
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockPrediction),
    });

    const sensorData = {
      venueId: 'test',
      currentDensity: [{ sectorId: 'S1', density: 70 }]
    };
    const result = await getCrowdPrediction(sensorData);

    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        responseMimeType: 'application/json'
      })
    }));
    expect(result).toEqual(mockPrediction);
  });
});
