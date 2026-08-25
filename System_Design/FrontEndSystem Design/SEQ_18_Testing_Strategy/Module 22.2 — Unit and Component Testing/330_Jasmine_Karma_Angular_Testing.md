# 330 – Jasmine & Karma – Angular Testing Patterns

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Angular uses **Jasmine** (BDD test framework) + **Karma** (test runner in real browsers) + **TestBed** (Angular's testing module). TestBed creates a testing module that configures dependencies, mocks services, and compiles components for testing.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

// ──── COMPONENT TESTING ────
describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CounterComponent], // or imports for standalone
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // trigger ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should increment counter', () => {
    component.increment();
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.count');
    expect(el.textContent).toContain('1');
  });
});

// ──── SERVICE TESTING ────
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // no outstanding requests

  it('fetches users', () => {
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
    });
    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1 }, { id: 2 }]);
  });
});

// ──── MOCKING SERVICES ────
describe('DashboardComponent', () => {
  const mockUserService = {
    getUsers: jasmine.createSpy('getUsers').and.returnValue(of([{ name: 'Hruday' }])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compileComponents();
  });

  it('displays user name', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hruday');
  });
});

// ──── PIPE TESTING ────
describe('CurrencyPipe', () => {
  const pipe = new CurrencyFormatPipe();
  it('formats USD', () => {
    expect(pipe.transform(1299, 'USD')).toBe('$12.99');
  });
});

// ──── DIRECTIVE TESTING ────
@Component({ template: '<div appHighlight>Test</div>' })
class TestHostComponent {}

describe('HighlightDirective', () => {
  it('adds background color', () => {
    TestBed.configureTestingModule({
      declarations: [HighlightDirective, TestHostComponent],
    });
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    const div = fixture.nativeElement.querySelector('div');
    expect(div.style.backgroundColor).toBe('yellow');
  });
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Angular testing uses TestBed to create a mini NgModule for each test. I configure dependencies, mock services with jasmine.createSpy, and use HttpTestingController for HTTP tests. At SAP/Oracle, I wrote Angular tests extensively — key patterns: mock at the service boundary, use fixture.detectChanges for change detection, and httpMock.verify to catch unmocked requests."*

## 4. 🧠 MEMORY AID
**"TestBed = Angular's testing module. fixture.detectChanges() = trigger CD. httpMock.expectOne() = intercept HTTP. Mock services via { provide, useValue }."**

## 5. 🎯 KEY INSIGHT
Modern Angular (v15+) supports standalone components in tests: `TestBed.configureTestingModule({ imports: [MyStandaloneComponent] })` — simpler setup.
