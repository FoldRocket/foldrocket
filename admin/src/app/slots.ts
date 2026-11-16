import type { ComponentType } from 'react';
import type { MediaAsset } from '../types';

export type InspectorImageToolProps = {
  asset: MediaAsset;
  attachmentId: number;
};

export const uiSlots: {
  extraPages: Record<string, ComponentType>;
  InspectorView: ComponentType | null;
  FreeEditionBannerView: ComponentType<{ onOpenLicense: () => void }> | null;
  readLicenseActive: () => boolean;
  ImageEditTool: ComponentType<InspectorImageToolProps> | null;
  ResizeTool: ComponentType<InspectorImageToolProps> | null;
  FormatConvertTool: ComponentType<InspectorImageToolProps> | null;
  RemoveBackgroundTool: ComponentType<InspectorImageToolProps> | null;
  AiImageEditTool: ComponentType<InspectorImageToolProps> | null;
  VideoOptimizerTool: ComponentType<InspectorImageToolProps> | null;
} = {
  extraPages: {},
  InspectorView: null,
  FreeEditionBannerView: null,
  readLicenseActive: () => true,
  ImageEditTool: null,
  ResizeTool: null,
  FormatConvertTool: null,
  RemoveBackgroundTool: null,
  AiImageEditTool: null,
  VideoOptimizerTool: null,
};
