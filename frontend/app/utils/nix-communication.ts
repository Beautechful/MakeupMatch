// WebSerial API type definitions for Nix device communication
interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialPortRequestOptions {
  filters?: SerialPortFilter[];
}

interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface Serial {
  getPorts(): Promise<SerialPort[]>;
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
}

declare global {
  interface Navigator {
    serial: Serial;
  }
}

export interface SerialDeviceInfo {
  port: SerialPort;
  vendorId?: number;
  productId?: number;
}

/**
 * Nix Serial Communication Class
 * Based on the Python nix_communication.py implementation
 * Uses WebSerial API to communicate with Nix Mini 3 via virtual COM port
 */
export class NixSerialCommunication {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private debug: boolean;
  private isConnecting: boolean = false;

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * Sleep utility function (equivalent to Python's time.sleep(0.1))
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if WebSerial API is supported in the current browser
   */
  isWebSerialSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * Get all connected serial ports that the user has previously granted access to
   */
  async getConnectedPorts(): Promise<SerialDeviceInfo[]> {
    if (!this.isWebSerialSupported()) {
      throw new Error('WebSerial API is not supported in this browser');
    }

    try {
      const ports = await navigator.serial.getPorts();
      const portInfos: SerialDeviceInfo[] = [];

      for (const port of ports) {
        const info = port.getInfo();
        const portInfo: SerialDeviceInfo = {
          port,
          vendorId: info.usbVendorId,
          productId: info.usbProductId,
        };
        portInfos.push(portInfo);
      }

      if (this.debug) {
        console.log('Connected serial ports:', portInfos);
      }

      return portInfos;
    } catch (error) {
      console.error('Error getting connected serial ports:', error);
      throw error;
    }
  }

  /**
   * List vendor IDs of all connected ports
   */
  async listVendorIds(): Promise<number[]> {
    const ports = await this.getConnectedPorts();
    const vendorIds = ports
      .map((port) => port.vendorId)
      .filter((id): id is number => id !== undefined);

    if (this.debug) {
      console.log(
        'Vendor IDs found:',
        vendorIds.map((id) => `0x${id.toString(16).padStart(4, '0')}`),
      );
    }

    return vendorIds;
  }

  /**
   * Request access to a serial port with optional filters
   * Equivalent to Python's port detection logic
   */
  async requestPort(filters?: SerialPortFilter[]): Promise<SerialDeviceInfo> {
    if (!this.isWebSerialSupported()) {
      throw new Error('WebSerial API is not supported in this browser');
    }

    try {
      const port = await navigator.serial.requestPort({
        filters: filters || [],
      });

      const info = port.getInfo();
      const portInfo: SerialDeviceInfo = {
        port,
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
      };

      if (this.debug) {
        console.log('Serial port selected:', portInfo);
      }

      return portInfo;
    } catch (error) {
      console.error('Error requesting serial port:', error);
      throw error;
    }
  }

  /**
   * Request access to Nix device by vendor ID
   */
  async requestNixDevice(): Promise<SerialDeviceInfo> {
    return this.requestPort([{ usbVendorId: 0x2af6 }]);
  }
  /**
   * Connect to serial port (equivalent to Python's serial.Serial())
   */
  async connect(port: SerialPort): Promise<void> {
    // Prevent duplicate connection attempts
    if (this.isConnecting) {
      throw new Error('Connection already in progress');
    }

    if (this.port) {
      if (this.debug) {
        console.log('Already connected to a port');
      }
      return;
    }

    this.isConnecting = true;

    try {
      this.port = port;

      // Open with same settings as Python code: baudrate=115200, bytesize=8, timeout=1, stopbits=1
      await this.port.open({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 255,
        flowControl: 'none',
      });

      // Set up reader and writer
      if (!this.port.readable || !this.port.writable) {
        throw new Error('Port streams not available');
      }

      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      if (this.debug) {
        console.log('Serial connection opened');
      }

      // Auto-unlock like Python __init__ does
      await this.unlock();
    } catch (error) {
      console.error('Error connecting to serial port:', error);
      // Clean up if connection failed
      if (this.port) {
        try {
          await this.port.close();
        } catch (closeError) {
          console.warn(
            'Error closing port after failed connection:',
            closeError,
          );
        }
        this.port = null;
        this.reader = null;
        this.writer = null;
      }
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from the current port
   */
  async disconnect(): Promise<void> {
    if (!this.port) return;

    try {
      // Release reader and writer
      if (this.reader) {
        await this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.releaseLock();
        this.writer = null;
      }

      await this.port.close();

      if (this.debug) {
        console.log('Serial port disconnected');
      }

      this.port = null;
    } catch (error) {
      console.error('Error disconnecting from serial port:', error);
      // Clean up even if there was an error
      this.port = null;
      this.reader = null;
      this.writer = null;
      throw error;
    } finally {
      // Reset connection flag
      this.isConnecting = false;
    }
  }

  /**
   * Get the currently connected port
   */
  getCurrentPort(): SerialPort | null {
    return this.port;
  }

  /**
   * Check if device is connected and ready for communication
   */
  isConnected(): boolean {
    return this.port !== null && this.reader !== null && this.writer !== null;
  } /**
   * Send data and read response (equivalent to Python's send() method)
   */
  private async send(data: Uint8Array): Promise<Uint8Array> {
    if (!this.writer || !this.reader) {
      throw new Error('Device not connected');
    }

    try {
      // Send data
      await this.writer.write(data);

      if (this.debug) {
        console.log('Data sent, waiting for response...');
      }

      // Wait a bit like Python's time.sleep(0.1)
      await this.sleep(100);

      // Read response with timeout (Python uses ser.read(ser.in_waiting or 1))
      // Some commands may not return data immediately
      try {
        const response = await this.readWithTimeout(1000);

        if (this.debug && response.length > 0) {
          console.log('Received response:', response.length, 'bytes');
        }
        return response;
      } catch {
        // Return empty response if timeout (some commands don't return data)
        if (this.debug) {
          console.log('No response received (timeout)');
        }
        return new Uint8Array(0);
      }
    } catch (error) {
      console.error('Error sending data to device:', error);
      throw error;
    }
  }

  /**
   * Send array of numbers (equivalent to Python's send_array() method)
   */
  private async sendArray(data: number[]): Promise<Uint8Array> {
    const dataToSend = new Uint8Array(data);

    if (this.debug) {
      console.log(
        'Sending data:',
        Array.from(dataToSend)
          .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
          .join(' '),
      );
    }

    return this.send(dataToSend);
  }
  /**
   * Read with timeout to prevent hanging (equivalent to Python's timeout=1)
   */
  private async readWithTimeout(timeoutMs: number = 1000): Promise<Uint8Array> {
    if (!this.reader) {
      throw new Error('No reader available');
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Read timeout')), timeoutMs);
    });

    const read = this.reader.read().then((result) => {
      if (result.value) {
        return result.value;
      }
      return new Uint8Array();
    });

    return Promise.race([read, timeout]);
  } /**
   * Read specific number of bytes with timeout (equivalent to Python's ser.read(12))
   */
  private async readBytes(
    count: number,
    timeoutMs: number = 1000,
  ): Promise<Uint8Array> {
    if (!this.reader) {
      throw new Error('No reader available');
    }

    if (this.debug) {
      console.log(
        `📖 Starting readBytes: expecting ${count} bytes, timeout ${timeoutMs}ms`,
      );
    }

    const result = new Uint8Array(count);
    let bytesRead = 0;
    const startTime = Date.now();

    while (bytesRead < count) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        if (this.debug) {
          console.log(
            `⏰ Read timeout after ${elapsed}ms: only received ${bytesRead}/${count} bytes`,
          );
        }
        throw new Error(
          `Read timeout: only received ${bytesRead}/${count} bytes`,
        );
      }

      try {
        if (this.debug && bytesRead === 0) {
          console.log('🔄 Waiting for first data chunk...');
        }
        const { value } = await this.reader.read();
        if (value && value.length > 0) {
          const remainingBytes = count - bytesRead;
          const bytesToCopy = Math.min(value.length, remainingBytes);
          result.set(value.slice(0, bytesToCopy), bytesRead);
          bytesRead += bytesToCopy;

          if (this.debug) {
            console.log(
              `📥 Received ${value.length} bytes, copied ${bytesToCopy}, total: ${bytesRead}/${count}`,
            );
            console.log(
              `📊 Data chunk:`,
              Array.from(value.slice(0, bytesToCopy)),
            );
          }
        } else {
          if (this.debug) {
            console.log('📭 Received empty data chunk, waiting...');
          }
          // Add delay if no data received to prevent tight loop
          await this.sleep(20);
        }
      } catch (error) {
        if (this.debug) {
          console.log('❌ Error reading chunk:', error);
        }
        throw new Error(
          `Error reading bytes: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (this.debug) {
      const elapsed = Date.now() - startTime;
      console.log(`✅ Successfully read ${bytesRead} bytes in ${elapsed}ms`);
      console.log(`📊 Complete data:`, Array.from(result));
    }

    return result;
  }

  /**
   * Clear any pending data in the device buffer
   */
  private async clearBuffer(): Promise<void> {
    if (!this.reader) {
      return;
    }

    if (this.debug) {
      console.log('🧹 Clearing device buffer...');
    }

    try {
      // Try to read any pending data with a short timeout
      let totalCleared = 0;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const data = await this.readWithTimeout(100); // Short timeout
          if (data.length === 0) {
            break; // No more data
          }
          totalCleared += data.length;
          attempts++;

          if (this.debug) {
            console.log(`🧹 Cleared ${data.length} bytes from buffer`);
          }
        } catch {
          // Timeout means no more data - this is expected
          break;
        }
      }

      if (this.debug && totalCleared > 0) {
        console.log(`🧹 Total cleared: ${totalCleared} bytes`);
      }
    } catch (error) {
      if (this.debug) {
        console.log('Buffer clear error (non-critical):', error);
      }
    }
  }

  private async drainBuffer(timeoutMs = 100): Promise<void> {
    if (!this.reader) return;
    try {
      while (true) {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('drain timeout')), timeoutMs),
        );
        const read = this.reader.read();
        const result = await Promise.race([read, timeout]);
        if (!result.value || result.value.length === 0) break;
        // Optionally log: console.log('Drained:', result.value.length, 'bytes');
      }
    } catch {
      // Timeout means buffer is empty, which is what we want
    }
  }

  // ===== NIX DEVICE SPECIFIC METHODS (from Python implementation) =====

  /**
   * Unlock the device (equivalent to Python's unlock() method)
   * This is the first command that must be sent to activate the device
   */
  async unlock(): Promise<Uint8Array> {
    if (this.debug) {
      console.log('🔓 Unlocking Nix device...');
    }

    const unlockCommand = [
      0xf0, 0x74, 0xa3, 0x8b, 0x89, 0x4b, 0x36, 0xae, 0x6e, 0x05, 0x9b, 0x93,
      0x3f, 0x44, 0xa6, 0x4c, 0xe7, 0x51, 0x3c, 0xa5, 0x98,
    ];

    return await this.sendArray(unlockCommand);
  }

  /**
   * Get device name (equivalent to Python's get_name() method)
   */
  async getName(): Promise<Uint8Array> {
    if (this.debug) {
      console.log('📛 Getting device name...');
    }

    return await this.send(new Uint8Array([0x80]));
  }

  /**
   * Get device version (equivalent to Python's version() method)
   */
  async getVersion(): Promise<Uint8Array> {
    if (this.debug) {
      console.log('📋 Getting device version...');
    }

    return await this.sendArray([0xa0, 0x03, 0xc0]);
  } /**
   * Scan and get color measurement (equivalent to Python's scan_and_print() method)
   */
  async scanAndPrint(): Promise<[number, number, number]> {
    if (this.debug) {
      console.log('🎨 Scanning color...');
    }

    try {
      if (!this.writer) {
        throw new Error('Writer not available');
      }

      // Step 1: Send scan command using sendArray (like Python's send_array([0xC0, 0x02]))
      // This includes the sleep and reads any response
      if (this.debug) {
        console.log('Step 1: Sending scan command via sendArray...');
      }

      const scanResponse = await this.sendArray([0xc0, 0x02]);
      if (this.debug) {
        console.log('Scan command response:', scanResponse.length, 'bytes');
      }

      // Step 2: Send result command directly and immediately read (like Python)
      // Python does: self.ser.write(data_to_send) followed by self.ser.read(12)
      if (this.debug) {
        console.log('Step 2: Sending result command and reading data...');
      }
      const resultCommand = new Uint8Array([0xc2, 0x02, 0x01, 0x03, 0x01]);
      await this.writer.write(resultCommand);

      // Give the device a moment to process the request
      await this.sleep(50);

      // Immediately read 12 bytes without any delay (like Python)
      if (this.debug) {
        console.log('🔍 Reading 12 bytes of measurement data...');
      }

      const response = await this.readBytes(12, 5000); // 5 second timeout for color data

      if (this.debug) {
        console.log(
          `📊 Received ${response.length} bytes:`,
          Array.from(response),
        );
      }

      if (response.length !== 12) {
        throw new Error(`Expected 12 bytes, received ${response.length} bytes`);
      }

      // Unpack 3 floats (little-endian) like Python's struct.unpack('<3f', res)
      const view = new DataView(response.buffer);
      const l = view.getFloat32(0, true); // little-endian
      const a = view.getFloat32(4, true);
      const b = view.getFloat32(8, true);

      if (this.debug) {
        console.log('Color values (L*a*b*):', l, a, b);
      }

      // Drain buffer after reading response
      await this.drainBuffer();
      await this.sleep(150); // Short delay after draining
      // Hard reset connection after scan
      await this.hardResetConnection();
      return [l, a, b];
    } catch (error) {
      console.error('Error in scanAndPrint:', error);
      throw error;
    }
  }

  /**
   * Get full scan results (equivalent to Python's scan_and_print_full() method)
   */
  async scanAndPrintFull(): Promise<string> {
    if (this.debug) {
      console.log('🎨 Getting full scan results...');
    }

    try {
      // Send scan command - may not return data, just triggers measurement
      if (!this.writer) {
        throw new Error('Writer not available');
      }

      const scanCommand = new Uint8Array([0xc0, 0x02]);
      await this.writer.write(scanCommand);
      await this.sleep(100);

      // Try to read scan response but don't fail if there isn't one
      try {
        const scanResponse = await this.readWithTimeout(500);
        if (this.debug && scanResponse.length > 0) {
          console.log('Scan response:', scanResponse.length, 'bytes');
        }
      } catch {
        if (this.debug) {
          console.log('Scan command had no response (normal)');
        }
      }

      // Send results command
      const response = await this.sendArray([0xc6, 0x02, 0x03, 0x01]);

      // Decode ASCII response like Python
      const responseText = new TextDecoder('ascii').decode(response);

      if (this.debug) {
        console.log('Full scan response:');
        responseText.split('\r\n').forEach((line) => {
          if (line.trim()) console.log(line);
        });
      }

      return responseText;
    } catch (error) {
      console.error('Error in scanAndPrintFull:', error);
      throw error;
    }
  }

  /**
   * Get CIELAB values (equivalent to Python's get_CIELAB() method)
   * This is the main method for getting color measurements
   */
  async getCIELAB(): Promise<[number, number, number]> {
    const getCIELABInternal = async (): Promise<[number, number, number]> => {
      try {
        // Send scan command - this may not return data, just triggers measurement
        if (!this.writer) {
          throw new Error('Writer not available');
        }

        if (this.debug) {
          console.log('Sending scan command for CIELAB...');
        }

        // const resultCommand = new Uint8Array([0xc0, 0x02]);
        // await this.writer.write(resultCommand);
        const scanResponse = await this.sendArray([0xc0, 0x02]);
        if (this.debug) {
          console.log('Scan command response:', scanResponse.length, 'bytes');
        }
        // await this.drainBuffer();
        await this.sleep(500); // Short delay after draining

        const response = await this.sendArray([0xc6, 0x02, 0x03, 0x01]);
        // Drain buffer after reading response
        await this.drainBuffer();
        await this.sleep(150); // Short delay after draining
        // Hard reset connection after scan
        await this.hardResetConnection();

        // Decode ASCII response
        const responseText = new TextDecoder('ascii').decode(response);
        if (this.debug) {
          console.log('CIELAB response:', responseText);
        }
        const lines = responseText.split('\r\n');

        const cielabValues: number[] = [];
        for (const line of lines) {
          if (line.includes('CIELAB')) {
            const parts = line.split(',');
            if (parts.length > 1) {
              const number = parseFloat(parts[1].trim());
              if (!isNaN(number)) {
                cielabValues.push(number);
              }
            }
          }
        }

        if (cielabValues.length >= 3) {
          if (this.debug) {
            console.log('CIELAB values:', cielabValues.slice(0, 3));
          }
          return [cielabValues[0], cielabValues[1], cielabValues[2]];
        }

        throw new Error('Could not parse CIELAB values from response');
      } catch (error) {
        console.error('Error getting CIELAB:', error);
        throw error;
      }
    };

    try {
      return await getCIELABInternal();
    } catch {
      // Reconnect and retry like Python does
      if (this.debug) {
        console.log('CIELAB failed, reconnecting and retrying...');
      }

      try {
        await this.reconnect();
        return await getCIELABInternal();
      } catch (retryError) {
        console.error('CIELAB retry failed:', retryError);
        throw retryError;
      }
    }
  }

  /**
   * Reconnect to device (equivalent to Python's __init__() call in exception handler)
   */
  private async reconnect(): Promise<void> {
    try {
      // Disconnect current connection
      await this.disconnect();

      // Find and reconnect to Nix device
      const portInfo = await this.requestNixDevice();
      await this.connect(portInfo.port);
    } catch (error) {
      console.error('Error during reconnect:', error);
      throw error;
    }
  }

  /**
   * Helper to hard reset the serial connection (disconnect and reconnect to the same port)
   */
  private async hardResetConnection() {
    if (!this.port) return;
    const port = this.port;
    await this.disconnect();
    await this.connect(port);
  }

  // ===== UTILITY METHODS =====
  /**
   * Debug scan sequence - step by step testing
   */
  async debugScanSequence(): Promise<void> {
    if (!this.writer) {
      throw new Error('Device not connected');
    }

    console.log('🔍 DEBUG: Testing scan sequence step by step...');

    try {
      // Step 1: Send scan command
      console.log('Step 1: Sending scan command [0xC0, 0x02]...');
      const scanCommand = new Uint8Array([0xc0, 0x02]);
      await this.writer.write(scanCommand);
      console.log('✅ Scan command sent');

      // Wait and check for response
      await this.sleep(100);
      try {
        const scanResponse = await this.readWithTimeout(1000);
        console.log(
          `Scan response: ${scanResponse.length} bytes -`,
          Array.from(scanResponse),
        );
      } catch {
        console.log('No scan response (normal)');
      }

      // Step 2: Send result request
      console.log(
        'Step 2: Sending result request [0xC2, 0x02, 0x01, 0x03, 0x01]...',
      );
      const resultCommand = new Uint8Array([0xc2, 0x02, 0x01, 0x03, 0x01]);
      await this.writer.write(resultCommand);
      console.log('✅ Result request sent');

      // Wait a bit longer for measurement to complete
      console.log('⏳ Waiting for measurement to complete...');
      await this.sleep(500); // Longer wait

      // Step 3: Try to read result data with detailed debugging
      console.log('Step 3: Reading result data (expecting 12 bytes)...');
      try {
        const resultData = await this.readBytes(12, 10000); // 10 second timeout for debugging
        console.log(
          `✅ Result data: ${resultData.length} bytes -`,
          Array.from(resultData),
        );

        if (resultData.length === 12) {
          const view = new DataView(resultData.buffer);
          const l = view.getFloat32(0, true);
          const a = view.getFloat32(4, true);
          const b = view.getFloat32(8, true);
          console.log(`📊 Decoded L*a*b*: L=${l}, a=${a}, b=${b}`);
        }
      } catch (debugError) {
        console.log('❌ Failed to read result data:', debugError);

        // Try to read any available data
        console.log('🔍 Checking for any available data...');
        try {
          const anyData = await this.readWithTimeout(100);
          if (anyData.length > 0) {
            console.log(`Found ${anyData.length} bytes:`, Array.from(anyData));
          } else {
            console.log('No data available');
          }
        } catch {
          console.log('No data available (timeout)');
        }
      }
    } catch (debugSeqError) {
      console.log('❌ Debug scan sequence failed:', debugSeqError);
    }
  }

  /**
   * Scan for available serial ports and display their information
   */
  async scanAndDisplayPorts(): Promise<void> {
    console.log('🔍 Scanning for serial ports...');

    try {
      const ports = await this.getConnectedPorts();

      if (ports.length === 0) {
        console.log(
          'No serial ports found. You may need to request access to ports first.',
        );
        return;
      }

      console.log(`Found ${ports.length} serial port(s):`);
      console.table(
        ports.map((port, index) => ({
          Port: `Port ${index + 1}`,
          'Vendor ID': port.vendorId
            ? `0x${port.vendorId.toString(16).padStart(4, '0')}`
            : 'Unknown',
          'Product ID': port.productId
            ? `0x${port.productId.toString(16).padStart(4, '0')}`
            : 'Unknown',
          'Is Nix': port.vendorId === 0x2af6 ? '✅ Yes' : '❌ No',
        })),
      );
    } catch (error) {
      console.error('Error scanning for ports:', error);
    }
  }

  /**
   * Request access to any serial port and display information
   */
  async requestAndDisplayPort(): Promise<SerialDeviceInfo | null> {
    try {
      const portInfo = await this.requestPort();

      console.log('Selected port:', {
        'Vendor ID': portInfo.vendorId
          ? `0x${portInfo.vendorId.toString(16).padStart(4, '0')}`
          : 'Unknown',
        'Product ID': portInfo.productId
          ? `0x${portInfo.productId.toString(16).padStart(4, '0')}`
          : 'Unknown',
        'Is Nix Device': portInfo.vendorId === 0x2af6 ? 'Yes' : 'No',
      });

      return portInfo;
    } catch (error) {
      console.error('No port selected or error occurred:', error);
      return null;
    }
  }

  /**
   * Connect with retry logic
   */
  async connectWithRetry(port: SerialPort, retries: number): Promise<void> {
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
      try {
        await this.connect(port);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          if (this.debug) {
            console.log(`Connection attempt ${i + 1} failed, retrying...`);
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Connection failed after retries');
  }

  /**
   * Basic port diagnostics
   */
  async diagnosePort(port: SerialPort): Promise<void> {
    const info = port.getInfo();
    console.log('🔍 Port Diagnostics:');
    console.log(
      `  Vendor ID: 0x${(info.usbVendorId || 0).toString(16).padStart(4, '0')}`,
    );
    console.log(
      `  Product ID: 0x${(info.usbProductId || 0).toString(16).padStart(4, '0')}`,
    );

    // Try basic connection test
    try {
      console.log('  Connection test: Attempting to open port...');
      await this.connect(port);
      console.log('  ✅ Port opened successfully');

      // Try basic unlock command
      console.log('  Command test: Sending unlock command...');
      await this.unlock();
      console.log('  ✅ Unlock command sent successfully');

      await this.disconnect();
      console.log('  ✅ Port closed successfully');
    } catch (error) {
      console.log('  ❌ Diagnostic test failed:', error);
    }
  }

  /**
   * Helper to release and reacquire reader and writer
   */
  private async resetReaderWriter() {
    if (this.reader) {
      try {
        await this.reader.releaseLock();
      } catch {
        // ignore error releasing reader
      }
      this.reader = null;
    }
    if (this.writer) {
      try {
        await this.writer.releaseLock();
      } catch {
        // ignore error releasing writer
      }
      this.writer = null;
    }
    if (this.port) {
      if (this.port.readable && !this.reader) {
        this.reader = this.port.readable.getReader();
      }
      if (this.port.writable && !this.writer) {
        this.writer = this.port.writable.getWriter();
      }
    }
  }
}

// Export the class for use
export default NixSerialCommunication;
