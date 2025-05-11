import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";

interface ExpoFriendlyPDFConverterProps {
  pdfUri: string;
  onImageReady: (imageBase64: string) => void;
  onError: (error: string) => void;
}

const ExpoFriendlyPDFConverter: React.FC<ExpoFriendlyPDFConverterProps> = ({
  pdfUri,
  onImageReady,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfBase64, setPdfBase64] = useState<string>("");

  useEffect(() => {
    loadPdf();
  }, [pdfUri]);

  const loadPdf = async () => {
    try {
      // Read PDF file as base64
      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfBase64(base64);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading PDF:", error);
      onError("Failed to load PDF file");
      setIsLoading(false);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === "pdfConverted") {
        onImageReady(message.data);
      } else if (message.type === "error") {
        onError(message.message);
      } else if (message.type === "log") {
        console.log("PDF Converter:", message.message);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
      onError("Failed to process conversion");
    }
  };

  // HTML that uses PDF.js to render PDF to canvas and convert to image
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: white;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        #container {
          text-align: center;
        }
        canvas {
          max-width: 100%;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          border: 1px solid #ddd;
        }
        #status {
          margin-top: 10px;
          font-family: Arial, sans-serif;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div id="container">
        <canvas id="pdfCanvas"></canvas>
        <div id="status">Converting PDF...</div>
      </div>
      
      <script>
        function log(message) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'log',
              message: message
            }));
          }
        }
        
        function sendError(message) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: message
            }));
          }
        }
        
        function sendImage(base64) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pdfConverted',
              data: base64
            }));
          }
        }
        
        async function convertPdfToImage() {
          try {
            log('Starting PDF conversion...');
            
            // Set up PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            // Decode base64 PDF data
            const binaryStr = atob('${pdfBase64}');
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            
            log('Loading PDF document...');
            
            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({data: bytes});
            const pdf = await loadingTask.promise;
            
            log('PDF loaded, rendering first page...');
            
            // Get first page
            const page = await pdf.getPage(1);
            
            // Set up canvas
            const canvas = document.getElementById('pdfCanvas');
            const context = canvas.getContext('2d');
            
            // Scale for good quality (adjust as needed)
            const scale = 2.0;
            const viewport = page.getViewport({scale: scale});
            
            // Set canvas dimensions
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Render page to canvas
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            log('Page rendered, converting to image...');
            
            // Convert canvas to base64 image
            const dataURL = canvas.toDataURL('image/png', 0.9);
            const base64 = dataURL.split(',')[1];
            
            // Update status
            document.getElementById('status').textContent = 'Conversion complete!';
            
            // Send image back to React Native
            sendImage(base64);
            
            log('Image sent to React Native');
            
          } catch (error) {
            console.error('PDF conversion error:', error);
            document.getElementById('status').textContent = 'Error: ' + error.message;
            sendError('Error converting PDF: ' + error.message);
          }
        }
        
        // Start conversion when page loads
        document.addEventListener('DOMContentLoaded', () => {
          if ('${pdfBase64}' && window.ReactNativeWebView) {
            log('DOM loaded, starting conversion...');
            convertPdfToImage();
          } else {
            sendError('No PDF data or ReactNativeWebView not available');
          }
        });
      </script>
    </body>
    </html>
  `;

  if (isLoading || !pdfBase64) {
    return null; // Or return a loading indicator
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="compatibility"
        onError={(syntheticEvent) => {
          console.error("WebView error:", syntheticEvent.nativeEvent);
          onError("Failed to load PDF converter");
        }}
        onLoadEnd={() => {
          console.log("WebView loaded successfully");
        }}
        onLoadStart={() => {
          console.log("WebView starting to load...");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    opacity: 0, // Hide the WebView completely
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});

export default ExpoFriendlyPDFConverter;
