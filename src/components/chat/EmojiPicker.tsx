import React from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  return (
    <div className="relative">
      <div className="absolute bottom-0 right-0 z-10">
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => onEmojiSelect(emoji.native)}
          theme="light"
          previewPosition="none"
          searchPosition="top"
          navPosition="bottom"
          perLine={8}
          maxFrequentRows={2}
        />
      </div>
    </div>
  );
};

export default EmojiPicker;
