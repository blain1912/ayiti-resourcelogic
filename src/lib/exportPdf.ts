import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// 8.5 x 11 inches in mm
const PAGE_WIDTH_MM = 215.9;
const PAGE_HEIGHT_MM = 279.4;
const MARGIN_LR_MM = 25; // 2.5 cm
const MARGIN_BOTTOM_MM = 25; // 2.5 cm
const MARGIN_TOP_MM = 20; // 2 cm top

const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_LR_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;

export const exportToPdf = async (elementId: string, filename: string, title?: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Temporarily expand scroll areas for full capture
  const scrollAreas = element.querySelectorAll('[data-radix-scroll-area-viewport]');
  const originalStyles: { el: HTMLElement; height: string; overflow: string }[] = [];
  
  scrollAreas.forEach((sa) => {
    const el = sa as HTMLElement;
    originalStyles.push({ el, height: el.style.height, overflow: el.style.overflow });
    el.style.height = 'auto';
    el.style.overflow = 'visible';
  });

  try {
    // Find all page-break sections
    const sections = element.querySelectorAll('[data-pdf-section]');
    
    if (sections.length > 0) {
      // Multi-section export with proper page breaks
      const pdf = new jsPDF("p", "mm", "letter");
      let currentPage = 1;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        if (i > 0) {
          pdf.addPage();
          currentPage++;
        }

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: section.scrollWidth,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = CONTENT_WIDTH_MM;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // If section fits in one page
        if (imgHeight <= CONTENT_HEIGHT_MM) {
          pdf.addImage(imgData, "PNG", MARGIN_LR_MM, MARGIN_TOP_MM, imgWidth, imgHeight);
        } else {
          // Section spans multiple pages
          let heightLeft = imgHeight;
          let srcY = 0;
          let isFirstSlice = true;

          while (heightLeft > 0) {
            if (!isFirstSlice) {
              pdf.addPage();
              currentPage++;
            }

            const sliceHeight = Math.min(heightLeft, CONTENT_HEIGHT_MM);
            const srcSliceHeight = (sliceHeight / imgHeight) * canvas.height;

            // Create a slice canvas
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = srcSliceHeight;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceHeight, 0, 0, canvas.width, srcSliceHeight);
              const sliceImg = sliceCanvas.toDataURL("image/png");
              pdf.addImage(sliceImg, "PNG", MARGIN_LR_MM, MARGIN_TOP_MM, imgWidth, sliceHeight);
            }

            srcY += srcSliceHeight;
            heightLeft -= sliceHeight;
            isFirstSlice = false;
          }
        }
      }

      // Add page numbers to all pages
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${p} / ${totalPages}`,
          PAGE_WIDTH_MM / 2,
          PAGE_HEIGHT_MM - 10,
          { align: "center" }
        );
      }

      pdf.save(`${filename}.pdf`);
    } else {
      // Fallback: single element capture
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = CONTENT_WIDTH_MM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "letter");
      
      let heightLeft = imgHeight;
      let position = MARGIN_TOP_MM;
      let page = 1;

      // First page
      if (imgHeight <= CONTENT_HEIGHT_MM) {
        pdf.addImage(imgData, "PNG", MARGIN_LR_MM, position, imgWidth, imgHeight);
      } else {
        let srcY = 0;

        while (heightLeft > 0) {
          if (page > 1) {
            pdf.addPage();
            position = MARGIN_TOP_MM;
          }

          const sliceHeight = Math.min(heightLeft, CONTENT_HEIGHT_MM);
          const srcSliceHeight = (sliceHeight / imgHeight) * canvas.height;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = srcSliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcSliceHeight, 0, 0, canvas.width, srcSliceHeight);
            const sliceImg = sliceCanvas.toDataURL("image/png");
            pdf.addImage(sliceImg, "PNG", MARGIN_LR_MM, position, imgWidth, sliceHeight);
          }

          srcY += srcSliceHeight;
          heightLeft -= sliceHeight;
          page++;
        }
      }

      // Add page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${p} / ${totalPages}`,
          PAGE_WIDTH_MM / 2,
          PAGE_HEIGHT_MM - 10,
          { align: "center" }
        );
      }

      pdf.save(`${filename}.pdf`);
    }
  } finally {
    // Restore original styles
    originalStyles.forEach(({ el, height, overflow }) => {
      el.style.height = height;
      el.style.overflow = overflow;
    });
  }
};
