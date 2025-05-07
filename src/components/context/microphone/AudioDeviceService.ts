// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

// AudioDeviceService.ts
// Implementation of the audio device service

import { getPrimaryUser } from '../../../config/UserConfig';
import { IAudioContextService } from "../interfaces/IAudioContextService";
import { AudioSource, IAudioDeviceService } from "../interfaces/IAudioDeviceService";

// Audio configuration constants
const AUDIO_CONFIG = {
  SYSTEM_AUDIO_IDENTIFIERS: ["blackhole", "dipper"],
  DEFAULT_USER_NAME: getPrimaryUser(),
  CHANNEL: {
    MICROPHONE: 0,
    SYSTEM_AUDIO: 1
  },
  GAIN: {
    SILENT: 0.001  // -60dB, practically inaudible
  },
  FREQUENCY: {
    MICROPHONE: 440,   // A4
    SYSTEM_AUDIO: 880  // A5
  }
};

export class AudioDeviceService implements IAudioDeviceService {
  private _audioDevices: MediaDeviceInfo[] = [];
  private sources: Record<string, AudioSource> = {};
  private audioContextService: IAudioContextService;

  constructor(audioContextService: IAudioContextService) {
    this.audioContextService = audioContextService;
  }

  // --- Methods for device management ---

  getAudioDevices() {
    return this._audioDevices;
  }

  setAudioDevices(devices: MediaDeviceInfo[]) {
    this._audioDevices = devices;
  }

  getSources() {
    return this.sources;
  }

  // Filter devices for microphone and system audio
  filterDevicesForUI(): { microphoneDevices: MediaDeviceInfo[], systemAudioDevices: MediaDeviceInfo[] } {
    const microphoneDevices: MediaDeviceInfo[] = [];
    const systemAudioDevices: MediaDeviceInfo[] = [];
    
    this._audioDevices.forEach(device => {
      if (this.isSystemAudioDevice(device)) {
        systemAudioDevices.push(device);
      } else {
        microphoneDevices.push(device);
      }
    });
    
    return { microphoneDevices, systemAudioDevices };
  }

  // --- Methods for device type detection ---

  // Determine speaker name based on device
  getSpeakerNameForDevice(device: MediaDeviceInfo): string {
    return this.isSystemAudioDevice(device) ? "" : AUDIO_CONFIG.DEFAULT_USER_NAME;
  }

  // Determine if a device is system audio
  isSystemAudioDevice(device: MediaDeviceInfo): boolean {
    const label = device.label.toLowerCase();
    return AUDIO_CONFIG.SYSTEM_AUDIO_IDENTIFIERS.some(id => label.includes(id));
  }

  // --- Methods for connecting cognitive audio devices ---

  // Method to connect an audio device for brain input
  async connectDevice(deviceId: string | null): Promise<boolean> {
    if (!this.isValidDeviceId(deviceId) || this.sources[deviceId!]) {
      return false;
    }

    try {
      // Ensure the AudioContext is configured
      this.audioContextService.setupAudioContext();
      
      const audioContext = this.audioContextService.getAudioContext();
      const merger = this.audioContextService.getMerger();
      
      if (!this.validateAudioComponents(audioContext, merger)) return false;

      // Find the corresponding device
      const device = this._audioDevices.find(d => d.deviceId === deviceId);
      if (!device) {
        console.log("🎚️ [COGNITIVE-AUDIO-DEVICE] Selected audio device for brain input not found:", deviceId);
        return false;
      }
      
      const isSystemAudio = this.isSystemAudioDevice(device);
      const deviceType = isSystemAudio ? 'System Audio' : 'Microphone';
      console.log("🎚️ [COGNITIVE-AUDIO-DEVICE] Connecting audio device for brain input:", deviceType, device.label, deviceId);

      // Get the audio stream from the device
      const stream = await this.captureDeviceStream(deviceId!);
      if (!stream || stream.getAudioTracks().length === 0) {
        console.log("❌ [COGNITIVE-AUDIO-DEVICE] No audio tracks found for device:", deviceId);
        return false;
      }

      // Log the stream settings
      this.logStreamSettings(stream);

      // Create and connect the source node
      const source = audioContext!.createMediaStreamSource(stream);
      const channelIndex = isSystemAudio ? AUDIO_CONFIG.CHANNEL.SYSTEM_AUDIO : AUDIO_CONFIG.CHANNEL.MICROPHONE;
      const speakerName = this.getSpeakerNameForDevice(device);
      
      // Configure and connect the source node
      this.configureAndConnectSource(source, merger!, channelIndex);
      
      // Store the source
      this.sources[deviceId!] = { 
        stream, 
        source, 
        speakerName,
        isSystemAudio
      };
      
      console.log("✅ [COGNITIVE-AUDIO-DEVICE] Audio device connected to channel", channelIndex, "with speaker:", speakerName || "Default diarization");
      return true;
    } catch (error) {
      console.log("❌ [COGNITIVE-AUDIO-DEVICE] Error connecting audio device for brain input:", error);
      return false;
    }
  }

  // Disconnect an audio source
  disconnectDevice(deviceId: string) {
    if (!this.isValidDeviceId(deviceId)) return;

    if (this.sources[deviceId]) {
      try {
        // Disconnect the audio source
        this.sources[deviceId].source.disconnect();

        // Stop the oscillator if it exists (for silent sources)
        const sourceObj = this.sources[deviceId];
        const oscillator = sourceObj.oscillator;
        if (oscillator) {
          oscillator.stop();
          oscillator.disconnect();
        }

        // Stop all audio tracks
        for (const track of this.sources[deviceId].stream.getAudioTracks()) {
          track.enabled = false;
          track.stop();
        }

        // Remove the source
        delete this.sources[deviceId];
        console.log(`✅ Source ${deviceId} disconnected`);
      } catch (err) {
        console.error(`❌ Error disconnecting source ${deviceId}:`, err);
      }
    }
  }

  // Create a silent audio source for a specific channel
  createSilentSource(channelIndex: number, speakerName: string): string | null {
    const audioContext = this.audioContextService.getAudioContext();
    const merger = this.audioContextService.getMerger();
    
    if (!this.validateAudioComponents(audioContext, merger)) return null;
    
    // Security check for valid channels
    if (!this.isValidChannelIndex(channelIndex)) return null;
    
    try {
      console.log(`🔊 Creating silent source for channel ${channelIndex}...`);
      
      // Create silent audio source
      const { oscillator, gainNode } = this.createSilentAudioSource(
        audioContext!, 
        channelIndex
      );
      
      // Connect to merger at specific channel
      gainNode.connect(merger!, 0, channelIndex);
      oscillator.start();
      
      // Create unique ID for this source
      const fakeDeviceId = `silent-channel-${channelIndex}-${Date.now()}`;
      const isSystemAudio = channelIndex === AUDIO_CONFIG.CHANNEL.SYSTEM_AUDIO;
      
      // Store reference
      this.sources[fakeDeviceId] = {
        stream: new MediaStream(),
        source: gainNode as unknown as MediaStreamAudioSourceNode,
        speakerName,
        isSystemAudio,
        oscillator
      };
      
      console.log(`✅ Silent source created successfully for channel ${channelIndex}`);
      this.verifyDestinationTracks();
      
      return fakeDeviceId;
    } catch (error) {
      console.error("❌ Error creating silent source:", error);
      return null;
    }
  }

  // --- Private helper methods ---

  private isValidDeviceId(deviceId: string | null): boolean {
    return Boolean(deviceId && deviceId !== "N/A" && deviceId !== "");
  }

  private isValidChannelIndex(channelIndex: number): boolean {
    if (channelIndex !== AUDIO_CONFIG.CHANNEL.MICROPHONE && 
        channelIndex !== AUDIO_CONFIG.CHANNEL.SYSTEM_AUDIO) {
      console.error(`❌ Invalid channel ${channelIndex}. Only channels 0 and 1 are allowed!`);
      return false;
    }
    return true;
  }

  private validateAudioComponents(
    audioContext: AudioContext | null, 
    merger: ChannelMergerNode | null
  ): boolean {
    if (!audioContext || !merger) {
      console.error("❌ AudioContext or merger not available");
      return false;
    }
    return true;
  }

  private async captureDeviceStream(deviceId: string): Promise<MediaStream | null> {
    try {
      // Get device information
      const device = this._audioDevices.find(d => d.deviceId === deviceId);
      if (!device) {
        console.error(`❌ Device not found for ID: ${deviceId}`);
        return null;
      }
      
      const deviceLabel = device.label.toLowerCase();
      console.log(`🎤 Requesting device: ${deviceLabel}`);

      // Settings without specifying sample rate
      // Letting the system choose the native device value
      const constraints = {
        audio: {
          deviceId: { exact: deviceId },
          // Disable automatic processing to preserve raw quality
          echoCancellation: false,
          noiseSuppression: false,
          // Only specifying that we want 1 mono channel
          channelCount: 1 // Each source provides a mono channel
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log the actual settings obtained
      this.logStreamSettings(stream);
      
      return stream;
    } catch (error) {
      console.error("❌ Error capturing stream:", error);
      return null;
    }
  }

  private configureAndConnectSource(
    source: MediaStreamAudioSourceNode, 
    merger: ChannelMergerNode, 
    channelIndex: number
  ): void {
    // Source configurations
    source.channelCount = 1;
    source.channelCountMode = 'explicit';
    source.channelInterpretation = 'discrete';
    
    // Connect to specific channel in merger
    source.connect(merger, 0, channelIndex);
    console.log(`🔀 Source connected to channel ${channelIndex} of merger`);
  }

  private createSilentAudioSource(audioContext: AudioContext, channelIndex: number): { 
    oscillator: OscillatorNode, 
    gainNode: GainNode 
  } {
    // Frequency based on channel
    const frequency = channelIndex === AUDIO_CONFIG.CHANNEL.MICROPHONE 
      ? AUDIO_CONFIG.FREQUENCY.MICROPHONE 
      : AUDIO_CONFIG.FREQUENCY.SYSTEM_AUDIO;
    
    // Create oscillator
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    // Create gain node to control volume
    const gainNode = audioContext.createGain();
    gainNode.gain.value = AUDIO_CONFIG.GAIN.SILENT;
    
    // Configure gain node parameters
    gainNode.channelCount = 1;
    gainNode.channelCountMode = 'explicit';
    gainNode.channelInterpretation = 'discrete';
    
    // Connect oscillator to gain node
    oscillator.connect(gainNode);
    
    return { oscillator, gainNode };
  }

  private logStreamSettings(stream: MediaStream): void {
    const trackSettings = stream.getAudioTracks()[0].getSettings();
    console.log(`🎛️ Stream: sampleRate=${trackSettings.sampleRate || 'unknown'}, channelCount=${trackSettings.channelCount || 'unknown'}`);
  }

  private verifyDestinationTracks(): void {
    setTimeout(() => {
      const destination = this.audioContextService.getDestination();
      if (destination) {
        const trackCount = destination.stream.getAudioTracks().length;
        console.log(`🔍 Destination stream has ${trackCount} audio tracks`);
      }
    }, 100);
  }
} 