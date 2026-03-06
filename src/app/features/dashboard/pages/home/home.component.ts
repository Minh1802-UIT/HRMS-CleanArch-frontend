import { Component, ChangeDetectionStrategy, signal, computed, AfterViewInit, ElementRef, QueryList, ViewChildren, ViewChild } from '@angular/core';

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

  // Stats count-up animation
  statsProgress = signal(0);
  countedStats = computed(() => {
    const p = this.statsProgress() / 100;
    return {
      automation: Math.round(p * 100) + '%',
      recruiting: '-' + Math.round(p * 50) + '%',
      speed: p >= 1 ? '3\u00D7' : (Math.round(p * 30) / 10).toFixed(1).replace(/\.0$/, '') + '\u00D7',
    };
  });

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
      name: 'Dashboard', id: 'dash', icon: 'pi-chart-bar',
      title: 'Tổng quan Doanh nghiệp',
      description: 'Toàn bộ dữ liệu nhân sự trong một màn hình duy nhất. Theo dõi KPI theo thời gian thực, phát hiện bất thường và ra quyết định nhanh hơn.',
      bullets: ['Biểu đồ KPI nhân sự cập nhật realtime', 'Cảnh báo thông minh về bất thường', 'Báo cáo tùy chỉnh theo bộ phận/chi nhánh'],
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Chấm công', id: 'attn', icon: 'pi-clock',
      title: 'Chấm công thông minh',
      description: 'Ghi nhận giờ làm tự động qua FaceID, QR Code hoặc GPS. Loại bỏ hoàn toàn gian lận chấm công và sai sót đối soát cuối tháng.',
      bullets: ['Nhận diện khuôn mặt AI trên Mobile', 'Check-in GPS tại nhiều địa điểm', 'Báo cáo chấm công tự động mỗi tháng'],
      imageUrl: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Tăng ca (OT)', id: 'ot', icon: 'pi-moon',
      title: 'Quản lý Tăng ca',
      description: 'Hệ thống tự động ghi nhận, tính toán và phê duyệt giờ làm thêm theo đúng Luật lao động. Không còn tranh chấp về OT.',
      bullets: ['Đơn OT số hóa, duyệt trực tuyến', 'Tự động cộng vào lương cuối tháng', 'Giới hạn OT theo quy định pháp luật'],
      imageUrl: 'https://images.unsplash.com/photo-1504938547765-f93a21f04c11?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Nghỉ phép', id: 'lv', icon: 'pi-calendar-plus',
      title: 'Nghỉ phép & Vắng mặt',
      description: 'Quy trình xin nghỉ phép 100% trực tuyến. Nhân viên theo dõi quỹ phép năm, lãnh đạo duyệt ngay trên điện thoại trong 1 phút.',
      bullets: ['Theo dõi quỹ phép năm minh bạch', 'Duyệt đơn qua app Mobile tức thì', 'Tích hợp lịch nghỉ lễ theo quy định'],
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Bảng lương', id: 'pay', icon: 'pi-dollar',
      title: 'Bảng lương & Thuế TNCN',
      description: 'Tự động tính lương, phụ cấp, các khoản khấu trừ và xuất báo cáo Thuế TNCN theo đúng biểu mẫu mới nhất của Bộ Tài chính.',
      bullets: ['Tính lương tự động 100%, loại bỏ sai sót', 'Báo cáo Thuế TNCN & BHXH đúng chuẩn', 'Phiếu lương số hóa gửi email nhân viên'],
      imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Đào tạo', id: 'learn', icon: 'pi-book',
      title: 'Thư viện Đào tạo',
      description: 'Xây dựng lộ trình phát triển cho từng nhân viên. Theo dõi tiến độ học tập và đo lường hiệu quả đào tạo theo từng vị trí.',
      bullets: ['Lộ trình học tập cá nhân hóa', 'Theo dõi cert và kỹ năng theo thời gian', 'E-learning tích hợp ngay trong phần mềm'],
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Đánh giá KPI', id: 'perf', icon: 'pi-star',
      title: 'Đánh giá Hiệu suất',
      description: 'Thiết lập chu kỳ đánh giá 360°. Gắn KPI với mục tiêu doanh nghiệp và theo dõi tự động tiến độ của từng cá nhân và nhóm.',
      bullets: ['Đánh giá 360° từ nhiều chiều', 'KPI liên kết mục tiêu OKR công ty', 'Lịch sử đánh giá lưu trữ đầy đủ'],
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'Tuyển dụng', id: 'rec', icon: 'pi-users',
      title: 'Pipeline Tuyển dụng',
      description: 'Quản lý toàn bộ phễu tuyển dụng từ đăng tin, sàng lọc CV đến phỏng vấn và offer letter. Rút ngắn thời gian tuyển dụng 50%.',
      bullets: ['Đăng tin tuyển dụng đa kênh đồng thời', 'Theo dõi ứng viên theo Kanban pipeline', 'Lịch phỏng vấn tự động gửi email/SMS'],
      imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'KPI & OKR', id: 'kpi', icon: 'pi-chart-line',
      title: 'KPI & Mục tiêu OKR',
      description: 'Kết nối mục tiêu cá nhân với chiến lược công ty. Dashboard KPI giúp lãnh đạo nắm bắt tức thì ai đang vượt và ai cần hỗ trợ.',
      bullets: ['OKR theo quý liên kết chiến lược', 'Tự động tính điểm KPI cuối kỳ', 'Heatmap hiệu suất toàn công ty'],
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=900'
    },
    {
      name: 'HR AI Agent', id: 'ai', icon: 'pi-sparkles',
      title: 'Trợ lý HR bằng AI',
      description: 'AI phân tích hành vi nghỉ việc, gợi ý nhân viên có nguy cơ rời bỏ và tự động hóa các câu trả lời chính sách nội bộ 24/7.',
      bullets: ['Dự báo nguy cơ nghỉ việc sớm 3 tháng', 'Chatbot HR trả lời chính sách tự động', 'Phân tích sentiment qua khảo sát nội bộ'],
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=900'
    }
  ];

  activeModuleIndex = signal<number>(4); // Default to Payroll to match the user's screenshot

  trustedCompanies = [
    { name: 'Vingroup',       abbr: 'VG',  color: '#1d4ed8' },
    { name: 'FPT Software',   abbr: 'FPT', color: '#f97316' },
    { name: 'Viettel',        abbr: 'VТ',  color: '#dc2626' },
    { name: 'Masan Group',    abbr: 'MSN', color: '#16a34a' },
    { name: 'Techcombank',    abbr: 'TCB', color: '#ca8a04' },
    { name: 'VNPT',           abbr: 'VNP', color: '#7c3aed' },
    { name: 'VinFast',        abbr: 'VF',  color: '#0ea5e9' },
    { name: 'Sacombank',      abbr: 'STB', color: '#059669' },
  ];

  testimonials = [
    {
      name: 'Nguyễn Thị Lan',
      role: 'Giám đốc Nhân sự · Công ty CP Phát triển Bắc Á',
      avatar: 'https://i.pravatar.cc/100?img=47',
      quote: 'ZenithHR đã giúp chúng tôi rút ngắn thời gian tính lương từ 3 ngày xuống còn 2 giờ. Đội ngũ kế toán không còn lo sai sót nữa.'
    },
    {
      name: 'Trần Minh Đức',
      role: 'CEO · Startup công nghệ GreenTech Vietnam',
      avatar: 'https://i.pravatar.cc/100?img=33',
      quote: 'Onboarding nhân viên mới giờ hoàn toàn tự động. Từ ký hợp đồng điện tử đến cấp tài khoản hệ thống, mọi thứ chỉ mất 15 phút.'
    },
    {
      name: 'Phạm Thu Hương',
      role: 'Trưởng phòng HR · Tập đoàn Sản xuất MekoPlast',
      avatar: 'https://i.pravatar.cc/100?img=41',
      quote: 'Hệ thống chấm công FaceID chính xác tuyệt đối. Không còn gian lận giờ công, nhân viên cũng hài lòng hơn vì minh bạch.'
    }
  ];


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
  @ViewChild('roiSection') roiSection?: ElementRef;
  @ViewChildren('revealElement') revealElements!: QueryList<ElementRef>;

  ngAfterViewInit() {
    this.setupScrollAnimations();
    this.setupStatsAnimation();
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

  private setupStatsAnimation() {
    if (!this.roiSection || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.statsProgress() === 0) {
        this.runStatsCountUp();
      }
    }, { threshold: 0.25 });
    obs.observe(this.roiSection.nativeElement);
  }

  private runStatsCountUp() {
    const steps = 60;
    const interval = 1800 / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      this.statsProgress.set(Math.round((step / steps) * 100));
      if (step >= steps) {
        clearInterval(timer);
        this.statsProgress.set(100);
      }
    }, interval);
  }
}
