import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

/**
 * FaceDetectionService — wrapper around face-api.js for face detection,
 * landmark extraction, and 128-d embedding generation.
 *
 * Models are loaded from a CDN (jsdelivr) on first use and cached by the browser.
 * Total download: ~6MB (one-time).
 */
@Injectable({ providedIn: 'root' })
export class FaceDetectionService {
  private modelsLoaded = false;
  private loading = false;

  /** Local path to model weights (avoids CSP issues with external CDN) */
  private readonly MODEL_URL = '/assets/models/face-api';

  /**
   * Load required models. Safe to call multiple times — only loads once.
   * Models: SSD MobileNet v1 (detection), 68-point landmarks, face recognition net.
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded || this.loading) return;
    this.loading = true;

    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
      ]);
      this.modelsLoaded = true;
      console.log('[FaceDetection] Models loaded successfully');
    } catch (err) {
      console.error('[FaceDetection] Failed to load models:', err);
      throw err;
    } finally {
      this.loading = false;
    }
  }

  /** Check if models are loaded */
  get isReady(): boolean {
    return this.modelsLoaded;
  }

  /**
   * Detect the most prominent face in the input and return its
   * 128-dimensional descriptor (embedding).
   * Returns null if no face is detected.
   */
  async extractEmbedding(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    const detection = await faceapi
      .detectSingleFace(input as any)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.warn('[FaceDetection] No face detected in input');
      return null;
    }

    return detection.descriptor;
  }

  /**
   * Detect face and return bounding box + landmarks (for UI overlay).
   */
  async detectFace(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68> | null> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    const result = await faceapi
      .detectSingleFace(input as any)
      .withFaceLandmarks();

    return result || null;
  }

  /**
   * Compute cosine similarity between two face descriptor vectors.
   * Returns a value between -1 and 1 (higher = more similar).
   */
  computeSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  /**
   * Convert Float32Array to plain number[] for JSON serialization.
   */
  embeddingToArray(embedding: Float32Array): number[] {
    return Array.from(embedding);
  }
}
