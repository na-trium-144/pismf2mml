export interface SMFTrackInfo {
  name?: ArrayBuffer | Uint8Array;
  totalNotes: number;
  maxPoly: number;
  ticks: number;
}

export declare class SMFToMML {
  constructor(smfBuffer: ArrayBuffer);
  readonly trackInfo: SMFTrackInfo[];
  readonly title: ArrayBuffer | Uint8Array | null;
  convert(
    trackNumber: number,
    numChannels: number,
    withTempo: boolean,
    volume: number,
    transpose: number,
    detune: number
  ): { mml: string[]; ticks: number };
}

export declare function decodeMidiText(
  data: ArrayBuffer | Uint8Array | number[] | null | undefined,
  encoding?: string
): string;

export interface TrackConvertOption {
  trackIndex: number;
  outputPoly?: number;
  volume?: number;
  transpose?: number;
  detune?: number;
  name?: string;
}

export interface ConvertSmfToMmlOptions {
  encoding?: string;
  format?: 'mml' | 'smilebasic';
  maxChannels?: number;
  trackOptions?: TrackConvertOption[];
}

export interface ConvertSmfResult {
  title: string;
  mml: string;
  trackInfo: Array<{
    name: string;
    totalNotes: number;
    maxPoly: number;
    ticks: number;
  }>;
}

export declare function convertSmfToMml(
  smfBuffer: ArrayBuffer,
  options?: ConvertSmfToMmlOptions
): ConvertSmfResult;

declare const _default: {
  SMFToMML: typeof SMFToMML;
  decodeMidiText: typeof decodeMidiText;
  convertSmfToMml: typeof convertSmfToMml;
};

export default _default;
