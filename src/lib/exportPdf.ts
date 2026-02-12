import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    // Restore original styles
    originalStyles.forEach(({ el, height, overflow }) => {
      el.style.height = height;
      el.style.overflow = overflow;
    });
  }
};
