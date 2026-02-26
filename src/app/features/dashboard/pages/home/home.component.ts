import { Component, ChangeDetectionStrategy, signal, AfterViewInit, ElementRef, QueryList, ViewChildren } from '@angular/core';

import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

interface MarketingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  isMenuOpen = false;

  // Performance: Track loaded feature/module images to avoid eager-loading all at once
  loadedFeatureIds = signal(new Set<string>(['organization']));
  loadedModuleIndices = signal(new Set<number>([4]));

  // Dữ liệu cho phần Interactive Tabs bám sát hệ thống ZenithHR (Sử dụng ảnh thật bối cảnh Châu Á/Việt Nam)
  features: MarketingFeature[] = [
    {
      id: 'organization',
      title: 'Quản lý Hồ sơ & Sơ đồ tổ chức',
      description: 'Lưu trữ thông tin nhân viên tập trung. Vẽ sơ đồ tổ chức (Org Chart) trực quan, tự động cập nhật khi có biến động nhân sự.',
      icon: 'pi-sitemap',
      imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'attendance',
      title: 'Chấm công & FaceID',
      description: 'Chấm công AI nhận diện khuôn mặt qua điện thoại hoặc QR code. Tự động hóa dữ liệu ra/vào, giảm thiểu sai sót 100%.',
      icon: 'pi-user-edit',
      imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'payroll',
      title: 'Bảng lương & Thuế TNCN (PIT)',
      description: 'Tự động tính lương tháng, phụ cấp và xuất báo cáo Thuế TNCN, Bảo hiểm xã hội đúng chuẩn quy định Việt Nam.',
      icon: 'pi-dollar',
      imageUrl: 'https://images.unsplash.com/photo-1664575602276-acd073f104c1?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'leaves',
      title: 'Phê duyệt & Nghỉ phép',
      description: 'Quy trình duyệt phép online 100%. Nhân viên chủ động theo dõi quỹ phép năm và các ngày nghỉ lễ ngay trên Mobile.',
      icon: 'pi-calendar-plus',
      imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'government_forms',
      title: 'Bảo hiểm Xã hội (Social Insurance)',
      description: 'Hỗ trợ kết nối và điền biểu mẫu bảo hiểm xã hội, công đoàn tự động. Luôn cập nhật theo Luật lao động mới nhất.',
      icon: 'pi-file-pdf',
      imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=600'
    }
  ];

  faqs = signal<FAQ[]>([
    {
      id: 'faq-1',
      question: 'ZenithHR có tuân thủ Luật lao động Việt Nam không?',
      answer: 'Tất nhiên. Các công thức tính lương, Thuế TNCN và Bảo hiểm xã hội đều được cập nhật theo thông tư, nghị định mới nhất của Chính phủ.',
      isOpen: false
    },
    {
      id: 'faq-2',
      question: 'Phần mềm có hỗ trợ chấm công từ xa qua GPS/FaceID không?',
      answer: 'Có. Nhân viên có thể chấm công ngay trên app điện thoại bằng nhận diện khuôn mặt và định vị GPS tại các chi nhánh được cấu hình.',
      isOpen: false
    },
    {
      id: 'faq-3',
      question: 'Dữ liệu của nhân viên được bảo mật như thế nào?',
      answer: 'ZenithHR sử dụng hạ tầng đám mây cao cấp với mã hóa AES-256. Hệ thống phân quyền chặt chẽ đảm bảo chỉ người có thẩm quyền mới được xem dữ liệu nhạy cảm.',
      isOpen: false
    },
    {
      id: 'faq-4',
      question: 'Tôi có được hỗ trợ triển khai (Onboarding) trực tiếp không?',
      answer: 'Đội ngũ chuyên gia của chúng tôi sẽ đồng hành cùng bạn từ khâu nhập dữ liệu, cấu hình quy định công ty đến khi vận hành trơn tru.',
      isOpen: false
    }
  ]);

  activeFeatureId = signal<string>(this.features[0].id);

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  setActiveFeature(id: string) {
    this.activeFeatureId.set(id);
    this.loadedFeatureIds.update(s => new Set(s).add(id));
  }

  setActiveModule(index: number) {
    this.activeModuleIndex.set(index);
    this.loadedModuleIndices.update(s => new Set(s).add(index));
  }

  toggleFaq(id: string) {
    this.faqs.update(items =>
      items.map(faq =>
        faq.id === id ? { ...faq, isOpen: !faq.isOpen } : { ...faq, isOpen: false }
      )
    );
  }

  moduleFeatures = [
    { 
      name: 'Dashboard', 
      id: 'dash',
      title: 'Dashboard',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      name: 'Attendance', 
      id: 'attn',
      title: 'Attendance',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'OT', 
      id: 'ot',
      title: 'Overtime',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'Leave', 
      id: 'lv',
      title: 'Leave',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'Payroll', 
      id: 'pay',
      title: 'Payroll',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'Employee Learning Library', 
      id: 'learn',
      title: 'Learning',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'Performance Appraisal', 
      id: 'perf',
      title: 'Performance',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'Recruitment', 
      id: 'rec',
      title: 'Recruitment',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'KPI', 
      id: 'kpi',
      title: 'KPI Management',
      subtitle: 'ZenithHR Software',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800'
    },
    { 
      name: 'HR AI Agent', 
      id: 'ai', 
      highlight: true,
      title: 'HR AI Agent',
      subtitle: 'ZenithHR Intelligence',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800'
    }
  ];

  activeModuleIndex = signal<number>(4); // Default to Payroll to match the user's screenshot


  scrollModules(direction: 'left' | 'right') {
    const nextIndex = direction === 'left' 
      ? Math.max(0, this.activeModuleIndex() - 1)
      : Math.min(this.moduleFeatures.length - 1, this.activeModuleIndex() + 1);
    
    this.activeModuleIndex.set(nextIndex);
    this.loadedModuleIndices.update(s => new Set(s).add(nextIndex));
    
    // Logic to ensure the active element is visible in the scroll container
    const container = document.getElementById('module-slider');
    if (container) {
      const items = container.querySelectorAll('.module-item');
      if (items[nextIndex]) {
        items[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  // --- Scroll Animation Logic ---
  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  private setupScrollAnimations() {
    // Chỉ chạy ngAfterViewInit nếu trình duyệt hỗ trợ IntersectionObserver
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
        } else {
          // Xóa class để khi cuộn lại sẽ chạy animation lại từ đầu (Infinite loop)
          entry.target.classList.remove('reveal-active');
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1 // Kích hoạt sớm hơn một chút (10%)
    });

    // Bắt đầu theo dõi tất cả các phần tử có gắn #revealElement trong HTML
    this.revealElements.forEach(el => observer.observe(el.nativeElement));
  }
}
