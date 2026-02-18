import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

export default function PatientIntake() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const sessionToken = searchParams.get("token");
  
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; content: string }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: session } = trpc.intake.getSession.useQuery(
    { sessionToken: sessionToken || "" },
    { enabled: !!sessionToken }
  );

  const sendMessage = trpc.intake.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.response }
      ]);
      setIsLoading(false);
      
      if (data.isComplete) {
        // Show completion message
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { 
              role: "assistant", 
              content: "Thank you for providing all this information! Your intake is complete. Your physician will review this before your consultation. You can close this window now." 
            }
          ]);
        }, 1000);
      }
    },
    onError: () => {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error. Please try again or contact support if the problem persists." 
        }
      ]);
    }
  });

  // Load existing messages
  useEffect(() => {
    if (session?.messages) {
      setMessages(session.messages);
    } else if (session && messages.length === 0) {
      // Show initial greeting
      setMessages([{
        role: "assistant",
        content: "Hello! I'm here to help gather some information before your consultation. This will help your physician provide you with the best possible care. To start, could you please tell me what brings you in today?"
      }]);
    }
  }, [session]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsRecording(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            toast.error('Microphone access denied. Please enable microphone permissions.');
          } else if (event.error === 'no-speech') {
            toast.error('No speech detected. Please try again.');
          } else {
            toast.error('Voice recognition error. Please try typing instead.');
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !sessionToken || isLoading) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInputValue("");
    setIsLoading(true);

    sendMessage.mutate({
      sessionToken,
      message: userMessage
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      toast.error('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        toast.info('Listening... Speak now');
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice input. Please try again.');
      }
    }
  };

  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="p-8 max-w-md text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-2xl font-bold mb-2">Invalid Session</h1>
          <p className="text-muted-foreground">
            This intake session link is invalid or has expired. Please contact your healthcare provider for a new link.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container max-w-4xl py-4 flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Medical Intake Assistant</h1>
            <p className="text-sm text-muted-foreground">Gathering information for your consultation</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl py-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white shadow-sm border"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-700">You</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white shadow-sm border rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t shadow-lg">
        <div className="container max-w-4xl py-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isRecording ? "Listening..." : "Type your response or use voice input..."}
              disabled={isLoading || isRecording}
              className="flex-1"
            />
            <Button
              onClick={toggleVoiceInput}
              disabled={isLoading}
              size="icon"
              variant={isRecording ? "default" : "outline"}
              className={isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : ""}
              title={speechSupported ? (isRecording ? "Stop recording" : "Start voice input") : "Voice input not supported"}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Your information is secure and HIPAA-compliant
          </p>
        </div>
      </div>
    </div>
  );
}
