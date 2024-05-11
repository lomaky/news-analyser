export interface prompt {
  model: string;
  prompt: string;
  stream: boolean;
  format: string;
}

export interface chat {
  model: string;
  messages: message[],
  stream: boolean;

}

export interface message{
    role: string;
    content: string;
}