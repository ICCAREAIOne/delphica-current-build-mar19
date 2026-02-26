import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, MessageSquare, Activity, Send, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface CollaborationPanelProps {
  sessionId: number;
  currentUserId: number;
}

export function CollaborationPanel({ sessionId, currentUserId }: CollaborationPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  
  // Queries with polling for real-time updates
  const { data: participants, refetch: refetchParticipants } = trpc.collaboration.getParticipants.useQuery(
    { sessionId },
    { refetchInterval: 5000 } // Poll every 5 seconds
  );
  
  const { data: activeParticipants, refetch: refetchActive } = trpc.collaboration.getActiveParticipants.useQuery(
    { sessionId },
    { refetchInterval: 3000 } // Poll every 3 seconds for presence
  );
  
  const { data: comments, refetch: refetchComments } = trpc.collaboration.getComments.useQuery(
    { sessionId },
    { refetchInterval: 2000 } // Poll every 2 seconds for new comments
  );
  
  const { data: activity } = trpc.collaboration.getActivity.useQuery(
    { sessionId, limit: 20 },
    { refetchInterval: 5000 }
  );
  
  // Mutations
  const addComment = trpc.collaboration.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });
  
  const updateComment = trpc.collaboration.updateComment.useMutation({
    onSuccess: () => {
      setEditingCommentId(null);
      setEditText("");
      refetchComments();
      toast.success("Comment updated");
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
  
  const deleteComment = trpc.collaboration.deleteComment.useMutation({
    onSuccess: () => {
      refetchComments();
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
  
  const updatePresence = trpc.collaboration.updatePresence.useMutation();
  
  // Find current user's participant ID for presence updates
  const myParticipant = participants?.find(p => p.physicianId === currentUserId);
  
  // Send presence heartbeat every 30 seconds
  useEffect(() => {
    if (!myParticipant?.id) return;
    
    const interval = setInterval(() => {
      updatePresence.mutate({ participantId: myParticipant.id });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [myParticipant?.id]);
  
  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    addComment.mutate({
      sessionId,
      commentText: commentText.trim(),
      commentType: "general",
    });
  };
  
  const handleUpdateComment = (commentId: number) => {
    if (!editText.trim()) return;
    
    updateComment.mutate({
      commentId,
      commentText: editText.trim(),
    });
  };
  
  const handleDeleteComment = (commentId: number) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteComment.mutate({ commentId });
    }
  };
  
  const startEditing = (commentId: number, currentText: string) => {
    setEditingCommentId(commentId);
    setEditText(currentText);
  };
  
  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditText("");
  };
  
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  const isActive = (physicianId: number) => {
    return activeParticipants?.some(p => p.physicianId === physicianId);
  };
  
  return (
    <div className="grid gap-4">
      {/* Participants Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants?.length || 0})
          </CardTitle>
          <CardDescription>
            Physicians collaborating on this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants?.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{getInitials(participant.physicianName)}</AvatarFallback>
                    </Avatar>
                    {isActive(participant.physicianId) && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{participant.physicianName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{participant.physicianEmail}</p>
                  </div>
                </div>
                <Badge variant={participant.role === "owner" ? "default" : "secondary"}>
                  {participant.role}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Comments Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion ({comments?.length || 0})
          </CardTitle>
          <CardDescription>
            Collaborative case discussion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {comments?.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.physicianName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.physicianName || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        {comment.isEdited && (
                          <Badge variant="outline" className="text-xs">
                            edited
                          </Badge>
                        )}
                      </div>
                      
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={updateComment.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{comment.commentText}</p>
                          {comment.physicianId === currentUserId && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(comment.id, comment.commentText)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="mt-4 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAddComment}
              disabled={addComment.isPending || !commentText.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Comment
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Session changes and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {activity?.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                  <div className="flex-1">
                    <span className="font-medium">{item.physicianName}</span>
                    <span className="text-muted-foreground"> {item.activityType.replace(/_/g, " ")}</span>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
