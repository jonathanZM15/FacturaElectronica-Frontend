import React from 'react';

type Props = {
  open: boolean;
  imageUrl: string | null;
  onClose: () => void;
};

const ImageViewerModal: React.FC<Props> = ({ open, imageUrl, onClose }) => {
  React.useEffect(() => {
    console.log('ImageViewerModal:', { open, imageUrl });
  }, [open, imageUrl]);

  if (!open || !imageUrl) return null;

  return (
    <div className="img-viewer-backdrop" onClick={onClose}>
      <div className="img-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <button className="img-viewer-close" onClick={onClose} title="Cerrar">
          ✕
        </button>
        <img src={imageUrl} alt="Viewer" className="img-viewer-content" />
      </div>

      <style>{`
        .img-viewer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(2px);
        }

        .img-viewer-modal {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .img-viewer-content {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }

        .img-viewer-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .img-viewer-close:hover {
          background: #fff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 600px) {
          .img-viewer-modal {
            max-width: 95vw;
            max-height: 85vh;
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageViewerModal;
