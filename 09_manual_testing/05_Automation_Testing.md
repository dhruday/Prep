# Automation Testing - Interview Question Bank

## Table of Contents
1. [Automation Fundamentals](#automation-fundamentals)
2. [Selenium WebDriver](#selenium-webdriver)
3. [TestNG Framework](#testng-framework)
4. [Cucumber & BDD](#cucumber--bdd)
5. [Framework Design](#framework-design)
6. [CI/CD Integration](#cicd-integration)

---

## Automation Fundamentals

### Beginner Questions

#### Q1: What is Test Automation?
**Answer:**

Test Automation is the use of software tools to execute tests automatically, compare results, and report outcomes.

**Benefits:**
- Faster execution
- Reusable tests
- Consistent results
- Better coverage
- Supports CI/CD

**When to Automate:**
- Repetitive tests
- Regression tests
- Data-driven tests
- Cross-browser tests
- Smoke tests

**When NOT to Automate:**
- Exploratory testing
- One-time tests
- Usability testing
- Frequently changing features
- Tests requiring human judgment

---

#### Q2: What is Selenium?
**Answer:**

Selenium is an open-source automation framework for web application testing.

**Components:**

| Component | Purpose |
|-----------|---------|
| Selenium IDE | Record and playback |
| Selenium WebDriver | Browser automation API |
| Selenium Grid | Parallel execution |

**Supported Languages:**
- Java
- Python
- C#
- JavaScript
- Ruby

**Supported Browsers:**
- Chrome
- Firefox
- Safari
- Edge
- Internet Explorer

---

#### Q3: What is WebDriver?
**Answer:**

WebDriver is an API for controlling web browsers programmatically.

**Architecture:**
```
Test Script → WebDriver API → Browser Driver → Browser
```

**Example:**
```java
// Create driver instance
WebDriver driver = new ChromeDriver();

// Navigate to URL
driver.get("https://www.google.com");

// Find element and interact
WebElement searchBox = driver.findElement(By.name("q"));
searchBox.sendKeys("Selenium");
searchBox.submit();

// Close browser
driver.quit();
```

---

#### Q4: What are different types of locators in Selenium?
**Answer:**

| Locator | Syntax | Example |
|---------|--------|---------|
| ID | `By.id("id")` | `By.id("username")` |
| Name | `By.name("name")` | `By.name("email")` |
| Class Name | `By.className("class")` | `By.className("btn-primary")` |
| Tag Name | `By.tagName("tag")` | `By.tagName("input")` |
| Link Text | `By.linkText("text")` | `By.linkText("Click Here")` |
| Partial Link | `By.partialLinkText("text")` | `By.partialLinkText("Click")` |
| CSS Selector | `By.cssSelector("css")` | `By.cssSelector("#id .class")` |
| XPath | `By.xpath("xpath")` | `By.xpath("//input[@id='user']")` |

**Priority (Best to Use):**
1. ID (fastest, most reliable)
2. Name
3. CSS Selector
4. XPath (most flexible but slower)

---

#### Q5: What is the difference between findElement and findElements?
**Answer:**

| Aspect | findElement | findElements |
|--------|-------------|--------------|
| Returns | Single WebElement | List<WebElement> |
| No match | NoSuchElementException | Empty list |
| Use case | Single element | Multiple elements |

**Example:**
```java
// Single element
WebElement loginBtn = driver.findElement(By.id("login"));

// Multiple elements
List<WebElement> links = driver.findElements(By.tagName("a"));
System.out.println("Total links: " + links.size());

// Iterate
for (WebElement link : links) {
    System.out.println(link.getText());
}
```

---

### Intermediate Questions

#### Q6: Explain XPath with examples
**Answer:**

XPath is a language for navigating XML/HTML documents.

**Types:**
- **Absolute XPath:** From root (`/html/body/div/form/input`)
- **Relative XPath:** From anywhere (`//input[@id='username']`)

**XPath Syntax:**

```xpath
// Basic
//tagname[@attribute='value']
//input[@id='username']
//button[@class='submit-btn']

// Text
//button[text()='Submit']
//a[contains(text(),'Click')]

// Contains
//input[contains(@id,'user')]
//div[contains(@class,'error')]

// Starts-with
//input[starts-with(@id,'user')]

// Multiple attributes
//input[@type='text' and @name='email']
//input[@type='text' or @type='password']

// Parent/Child
//div[@id='parent']/child::input
//input[@id='child']/parent::div

// Following sibling
//label[text()='Email']/following-sibling::input

// Preceding sibling
//input[@id='password']/preceding-sibling::label

// Ancestor/Descendant
//input[@id='submit']/ancestor::form
//form[@id='login']//input

// Index
(//input[@type='text'])[1]
(//input[@type='text'])[last()]
```

---

#### Q7: Explain CSS Selectors with examples
**Answer:**

CSS Selectors are patterns for selecting elements.

```css
/* ID */
#username

/* Class */
.submit-btn

/* Tag */
input

/* Attribute */
input[type='text']
input[name='email']

/* Starts with */
input[id^='user']

/* Ends with */
input[id$='name']

/* Contains */
input[id*='ser']

/* Multiple classes */
.btn.primary

/* Child */
div > input

/* Descendant */
form input

/* Adjacent sibling */
label + input

/* Nth child */
tr:nth-child(2)
tr:nth-child(odd)
tr:nth-child(even)
```

**CSS vs XPath:**

| Aspect | CSS | XPath |
|--------|-----|-------|
| Speed | Faster | Slower |
| Traversal | Forward only | Both directions |
| Text | Cannot | Can |
| Syntax | Simpler | Complex |

---

#### Q8: How do you handle waits in Selenium?
**Answer:**

**1. Implicit Wait:**
```java
// Applies to all findElement calls
driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
```

**2. Explicit Wait:**
```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// Wait for element to be visible
WebElement element = wait.until(
    ExpectedConditions.visibilityOfElementLocated(By.id("username"))
);

// Wait for element to be clickable
wait.until(ExpectedConditions.elementToBeClickable(By.id("submit")));

// Wait for title
wait.until(ExpectedConditions.titleContains("Dashboard"));

// Wait for URL
wait.until(ExpectedConditions.urlContains("/home"));

// Wait for alert
wait.until(ExpectedConditions.alertIsPresent());
```

**3. Fluent Wait:**
```java
Wait<WebDriver> fluentWait = new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(30))
    .pollingEvery(Duration.ofSeconds(2))
    .ignoring(NoSuchElementException.class);

WebElement element = fluentWait.until(driver -> 
    driver.findElement(By.id("dynamic-element"))
);
```

**Common Expected Conditions:**
- `visibilityOfElementLocated()`
- `elementToBeClickable()`
- `presenceOfElementLocated()`
- `invisibilityOfElementLocated()`
- `textToBePresentInElement()`
- `alertIsPresent()`
- `frameToBeAvailableAndSwitchToIt()`

---

#### Q9: How do you handle different browser windows/tabs?
**Answer:**

```java
// Get current window handle
String mainWindow = driver.getWindowHandle();

// Click link that opens new window
driver.findElement(By.linkText("Open New Window")).click();

// Get all window handles
Set<String> allWindows = driver.getWindowHandles();

// Switch to new window
for (String window : allWindows) {
    if (!window.equals(mainWindow)) {
        driver.switchTo().window(window);
        break;
    }
}

// Perform actions in new window
System.out.println("New window title: " + driver.getTitle());

// Close new window and switch back
driver.close();
driver.switchTo().window(mainWindow);
```

---

#### Q10: How do you handle alerts in Selenium?
**Answer:**

```java
// Wait for alert
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.alertIsPresent());

// Switch to alert
Alert alert = driver.switchTo().alert();

// Get alert text
String alertText = alert.getText();

// Accept (OK)
alert.accept();

// Dismiss (Cancel)
alert.dismiss();

// Send text (prompt)
alert.sendKeys("Input text");
alert.accept();
```

**Alert Types:**
- Simple Alert (just OK button)
- Confirmation Alert (OK and Cancel)
- Prompt Alert (Text input)

---

#### Q11: How do you handle frames/iframes?
**Answer:**

```java
// Switch by index
driver.switchTo().frame(0);

// Switch by name or ID
driver.switchTo().frame("frameName");

// Switch by WebElement
WebElement frameElement = driver.findElement(By.xpath("//iframe[@id='myframe']"));
driver.switchTo().frame(frameElement);

// Perform actions inside frame
driver.findElement(By.id("elementInFrame")).click();

// Switch back to parent frame
driver.switchTo().parentFrame();

// Switch back to main content
driver.switchTo().defaultContent();

// Nested frames
driver.switchTo().frame("outerFrame");
driver.switchTo().frame("innerFrame");
// Work with inner frame elements
driver.switchTo().defaultContent(); // Back to top
```

---

#### Q12: How do you handle dropdowns?
**Answer:**

```java
// Using Select class
WebElement dropdown = driver.findElement(By.id("country"));
Select select = new Select(dropdown);

// Select by visible text
select.selectByVisibleText("India");

// Select by value
select.selectByValue("IN");

// Select by index
select.selectByIndex(2);

// Get selected option
WebElement selected = select.getFirstSelectedOption();
System.out.println(selected.getText());

// Get all options
List<WebElement> options = select.getOptions();
for (WebElement option : options) {
    System.out.println(option.getText());
}

// Multi-select
if (select.isMultiple()) {
    select.selectByVisibleText("Option1");
    select.selectByVisibleText("Option2");
    select.deselectAll();
}
```

**For non-Select dropdowns (custom):**
```java
// Click to open
driver.findElement(By.cssSelector(".dropdown-toggle")).click();

// Select option
driver.findElement(By.xpath("//li[text()='Option 1']")).click();
```

---

#### Q13: How do you handle mouse actions?
**Answer:**

```java
Actions actions = new Actions(driver);

// Click
actions.click(element).perform();

// Double click
actions.doubleClick(element).perform();

// Right click
actions.contextClick(element).perform();

// Hover
actions.moveToElement(element).perform();

// Drag and drop
actions.dragAndDrop(source, target).perform();

// Drag and drop by offset
actions.dragAndDropBy(element, xOffset, yOffset).perform();

// Click and hold
actions.clickAndHold(element).perform();

// Release
actions.release().perform();

// Chain actions
actions.moveToElement(menu)
       .pause(Duration.ofSeconds(1))
       .click(submenu)
       .perform();
```

---

#### Q14: How do you handle keyboard actions?
**Answer:**

```java
// Send keys to element
element.sendKeys("text");

// Special keys
element.sendKeys(Keys.ENTER);
element.sendKeys(Keys.TAB);
element.sendKeys(Keys.ESCAPE);
element.sendKeys(Keys.BACK_SPACE);

// Combinations
element.sendKeys(Keys.CONTROL, "a"); // Select all
element.sendKeys(Keys.CONTROL, "c"); // Copy
element.sendKeys(Keys.CONTROL, "v"); // Paste

// Using Actions
Actions actions = new Actions(driver);
actions.keyDown(Keys.CONTROL)
       .sendKeys("a")
       .keyUp(Keys.CONTROL)
       .perform();
```

---

### Advanced Questions

#### Q15: How do you handle dynamic elements?
**Answer:**

**Strategies:**

**1. Explicit Waits:**
```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement element = wait.until(
    ExpectedConditions.visibilityOfElementLocated(By.id("dynamicId"))
);
```

**2. Dynamic XPath/CSS:**
```java
// Contains
By.xpath("//div[contains(@id, 'user')]")

// Starts-with
By.xpath("//input[starts-with(@id, 'btn_')]")

// Relative locators
By.cssSelector("div[class*='active']")
```

**3. Parent-Child relationship:**
```java
By.xpath("//div[@class='container']//button[@type='submit']")
```

**4. JavaScript executor:**
```java
JavascriptExecutor js = (JavascriptExecutor) driver;
WebElement element = (WebElement) js.executeScript(
    "return document.querySelector('#dynamicElement')"
);
```

---

#### Q16: How do you handle file upload/download?
**Answer:**

**File Upload:**
```java
// Standard input[type='file']
WebElement upload = driver.findElement(By.id("fileUpload"));
upload.sendKeys("C:\\path\\to\\file.pdf");

// For non-standard uploads, use AutoIt or Robot
Robot robot = new Robot();
robot.keyPress(KeyEvent.VK_ENTER);
// ... file path handling
```

**File Download:**
```java
// Chrome options to set download directory
ChromeOptions options = new ChromeOptions();
Map<String, Object> prefs = new HashMap<>();
prefs.put("download.default_directory", "C:\\Downloads");
prefs.put("download.prompt_for_download", false);
options.setExperimentalOption("prefs", prefs);

WebDriver driver = new ChromeDriver(options);

// Click download link
driver.findElement(By.id("downloadLink")).click();

// Wait for file
File downloadedFile = new File("C:\\Downloads\\file.pdf");
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(30));
wait.until(d -> downloadedFile.exists());
```

---

#### Q17: How do you take screenshots?
**Answer:**

```java
// Take screenshot
File screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
FileUtils.copyFile(screenshot, new File("screenshot.png"));

// Screenshot of specific element
WebElement element = driver.findElement(By.id("logo"));
File elementScreenshot = element.getScreenshotAs(OutputType.FILE);
FileUtils.copyFile(elementScreenshot, new File("element.png"));

// Screenshot as Base64
String base64 = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BASE64);

// Full page screenshot (Firefox)
FirefoxDriver firefoxDriver = (FirefoxDriver) driver;
File fullPage = firefoxDriver.getFullPageScreenshotAs(OutputType.FILE);
```

---

#### Q18: How do you execute JavaScript?
**Answer:**

```java
JavascriptExecutor js = (JavascriptExecutor) driver;

// Click element
js.executeScript("arguments[0].click();", element);

// Scroll to element
js.executeScript("arguments[0].scrollIntoView(true);", element);

// Scroll by pixels
js.executeScript("window.scrollBy(0, 500)");

// Scroll to bottom
js.executeScript("window.scrollTo(0, document.body.scrollHeight)");

// Get value
String value = (String) js.executeScript("return arguments[0].value;", element);

// Set value
js.executeScript("arguments[0].value='new value';", element);

// Highlight element
js.executeScript("arguments[0].style.border='3px solid red'", element);

// Wait for page load
js.executeScript("return document.readyState").equals("complete");

// Get page title
String title = (String) js.executeScript("return document.title;");
```

---

## TestNG Framework

### Q19: What is TestNG?
**Answer:**

TestNG is a testing framework inspired by JUnit with powerful features for test organization.

**Features:**
- Annotations
- Parallel execution
- Data-driven testing
- Reporting
- Grouping
- Dependency management

**Basic Test:**
```java
import org.testng.annotations.*;
import org.testng.Assert;

public class LoginTest {
    
    @BeforeClass
    public void setup() {
        // Initialize driver
    }
    
    @Test
    public void testValidLogin() {
        // Test logic
        Assert.assertEquals(actual, expected);
    }
    
    @Test(priority = 1)
    public void testInvalidLogin() {
        // Test logic
    }
    
    @AfterClass
    public void teardown() {
        // Close driver
    }
}
```

---

#### Q20: Explain TestNG Annotations
**Answer:**

**Execution Order:**
```
@BeforeSuite
  @BeforeTest
    @BeforeClass
      @BeforeMethod
        @Test
      @AfterMethod
    @AfterClass
  @AfterTest
@AfterSuite
```

| Annotation | Scope | Runs |
|------------|-------|------|
| @BeforeSuite | Suite | Once per suite |
| @BeforeTest | Test tag | Once per <test> |
| @BeforeClass | Class | Once per class |
| @BeforeMethod | Method | Before each @Test |
| @Test | Test method | Test execution |
| @AfterMethod | Method | After each @Test |
| @AfterClass | Class | Once per class |
| @AfterTest | Test tag | Once per <test> |
| @AfterSuite | Suite | Once per suite |

---

#### Q21: How do you implement Data-Driven Testing in TestNG?
**Answer:**

**Using @DataProvider:**
```java
public class DataDrivenTest {
    
    @DataProvider(name = "loginData")
    public Object[][] getData() {
        return new Object[][] {
            {"user1", "pass1", true},
            {"user2", "wrong", false},
            {"", "pass3", false}
        };
    }
    
    @Test(dataProvider = "loginData")
    public void testLogin(String username, String password, boolean expected) {
        // Use the data
        boolean result = login(username, password);
        Assert.assertEquals(result, expected);
    }
    
    // DataProvider in different class
    @Test(dataProvider = "loginData", dataProviderClass = TestData.class)
    public void testLoginExternal(String username, String password) {
        // Test logic
    }
}
```

**Excel Data Provider:**
```java
@DataProvider(name = "excelData")
public Object[][] getExcelData() throws IOException {
    FileInputStream fis = new FileInputStream("testdata.xlsx");
    Workbook workbook = new XSSFWorkbook(fis);
    Sheet sheet = workbook.getSheet("Sheet1");
    
    int rowCount = sheet.getPhysicalNumberOfRows();
    int colCount = sheet.getRow(0).getPhysicalNumberOfCells();
    
    Object[][] data = new Object[rowCount - 1][colCount];
    
    for (int i = 1; i < rowCount; i++) {
        Row row = sheet.getRow(i);
        for (int j = 0; j < colCount; j++) {
            data[i - 1][j] = row.getCell(j).toString();
        }
    }
    
    workbook.close();
    return data;
}
```

---

#### Q22: How do you run tests in parallel?
**Answer:**

**testng.xml configuration:**
```xml
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Parallel Suite" parallel="methods" thread-count="3">
    <test name="Test">
        <classes>
            <class name="com.tests.LoginTest"/>
            <class name="com.tests.SearchTest"/>
        </classes>
    </test>
</suite>
```

**Parallel Options:**
- `parallel="methods"` - Methods run in parallel
- `parallel="tests"` - <test> tags run in parallel
- `parallel="classes"` - Classes run in parallel
- `parallel="instances"` - Instances run in parallel

**Thread-safe driver:**
```java
public class BaseTest {
    protected static ThreadLocal<WebDriver> driver = new ThreadLocal<>();
    
    @BeforeMethod
    public void setup() {
        driver.set(new ChromeDriver());
    }
    
    public WebDriver getDriver() {
        return driver.get();
    }
    
    @AfterMethod
    public void teardown() {
        getDriver().quit();
        driver.remove();
    }
}
```

---

#### Q23: Explain TestNG Assertions
**Answer:**

```java
import org.testng.Assert;
import org.testng.asserts.SoftAssert;

// Hard assertions (stop on failure)
Assert.assertEquals(actual, expected);
Assert.assertEquals(actual, expected, "Custom message");
Assert.assertTrue(condition);
Assert.assertFalse(condition);
Assert.assertNull(object);
Assert.assertNotNull(object);
Assert.fail("Force failure");

// Soft assertions (continue on failure)
SoftAssert softAssert = new SoftAssert();
softAssert.assertEquals(title, "Expected Title");
softAssert.assertTrue(isDisplayed);
softAssert.assertEquals(url, "expected-url");
softAssert.assertAll(); // Must call at the end!
```

---

#### Q24: How do you group and depend tests?
**Answer:**

```java
public class GroupingTest {
    
    @Test(groups = {"smoke", "regression"})
    public void loginTest() {
        // Critical test
    }
    
    @Test(groups = {"regression"})
    public void searchTest() {
        // Non-critical test
    }
    
    @Test(dependsOnMethods = {"loginTest"})
    public void dashboardTest() {
        // Depends on login
    }
    
    @Test(dependsOnGroups = {"smoke"})
    public void detailedTest() {
        // Depends on smoke group
    }
}
```

**testng.xml:**
```xml
<suite name="Suite">
    <test name="Smoke Test">
        <groups>
            <run>
                <include name="smoke"/>
            </run>
        </groups>
        <classes>
            <class name="com.tests.GroupingTest"/>
        </classes>
    </test>
</suite>
```

---

## Cucumber & BDD

### Q25: What is Cucumber?
**Answer:**

Cucumber is a BDD (Behavior-Driven Development) tool that allows writing tests in plain English using Gherkin syntax.

**Feature File (login.feature):**
```gherkin
Feature: Login Functionality
  As a user
  I want to login to the application
  So that I can access my account

  Background:
    Given I am on the login page

  Scenario: Successful login with valid credentials
    When I enter username "testuser@email.com"
    And I enter password "Test@123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see welcome message "Hello, Test User"

  Scenario: Failed login with invalid password
    When I enter username "testuser@email.com"
    And I enter password "wrongpassword"
    And I click the login button
    Then I should see error message "Invalid credentials"
    And I should remain on the login page
```

---

#### Q26: How do you implement Step Definitions?
**Answer:**

```java
import io.cucumber.java.en.*;

public class LoginSteps {
    
    WebDriver driver;
    LoginPage loginPage;
    
    @Given("I am on the login page")
    public void navigateToLoginPage() {
        driver = new ChromeDriver();
        driver.get("https://example.com/login");
        loginPage = new LoginPage(driver);
    }
    
    @When("I enter username {string}")
    public void enterUsername(String username) {
        loginPage.enterUsername(username);
    }
    
    @When("I enter password {string}")
    public void enterPassword(String password) {
        loginPage.enterPassword(password);
    }
    
    @When("I click the login button")
    public void clickLogin() {
        loginPage.clickLogin();
    }
    
    @Then("I should be redirected to the dashboard")
    public void verifyDashboard() {
        Assert.assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }
    
    @Then("I should see welcome message {string}")
    public void verifyWelcomeMessage(String message) {
        String actual = driver.findElement(By.id("welcome")).getText();
        Assert.assertEquals(actual, message);
    }
    
    @Then("I should see error message {string}")
    public void verifyErrorMessage(String message) {
        String actual = loginPage.getErrorMessage();
        Assert.assertEquals(actual, message);
    }
}
```

---

#### Q27: What are Scenario Outlines?
**Answer:**

Scenario Outline allows running same scenario with different data sets.

```gherkin
Feature: Login with multiple data sets

  Scenario Outline: Login with various credentials
    Given I am on the login page
    When I enter username "<username>"
    And I enter password "<password>"
    And I click the login button
    Then I should see "<result>"

    Examples:
      | username          | password    | result              |
      | valid@email.com   | ValidPass1  | Welcome             |
      | invalid@email.com | ValidPass1  | Invalid credentials |
      | valid@email.com   | WrongPass   | Invalid credentials |
      |                   | ValidPass1  | Username required   |
```

---

## Framework Design

### Q28: What is Page Object Model (POM)?
**Answer:**

POM is a design pattern where each web page is represented by a class with its elements and actions.

**LoginPage.java:**
```java
public class LoginPage {
    private WebDriver driver;
    
    // Locators
    @FindBy(id = "username")
    private WebElement usernameField;
    
    @FindBy(id = "password")
    private WebElement passwordField;
    
    @FindBy(id = "loginBtn")
    private WebElement loginButton;
    
    @FindBy(css = ".error-message")
    private WebElement errorMessage;
    
    // Constructor
    public LoginPage(WebDriver driver) {
        this.driver = driver;
        PageFactory.initElements(driver, this);
    }
    
    // Actions
    public void enterUsername(String username) {
        usernameField.clear();
        usernameField.sendKeys(username);
    }
    
    public void enterPassword(String password) {
        passwordField.clear();
        passwordField.sendKeys(password);
    }
    
    public DashboardPage clickLogin() {
        loginButton.click();
        return new DashboardPage(driver);
    }
    
    public String getErrorMessage() {
        return errorMessage.getText();
    }
    
    public DashboardPage login(String username, String password) {
        enterUsername(username);
        enterPassword(password);
        return clickLogin();
    }
}
```

**Test using POM:**
```java
public class LoginTest extends BaseTest {
    
    @Test
    public void testValidLogin() {
        LoginPage loginPage = new LoginPage(driver);
        DashboardPage dashboard = loginPage.login("user@test.com", "password");
        Assert.assertTrue(dashboard.isWelcomeDisplayed());
    }
}
```

---

#### Q29: What are the components of a Test Automation Framework?
**Answer:**

**1. Configuration Management:**
```java
// config.properties
browser=chrome
baseUrl=https://example.com
implicitWait=10

// ConfigReader.java
public class ConfigReader {
    private static Properties props;
    
    public static String getProperty(String key) {
        if (props == null) {
            props = new Properties();
            props.load(new FileInputStream("config.properties"));
        }
        return props.getProperty(key);
    }
}
```

**2. Driver Management:**
```java
public class DriverManager {
    private static ThreadLocal<WebDriver> driver = new ThreadLocal<>();
    
    public static WebDriver getDriver() {
        return driver.get();
    }
    
    public static void initDriver(String browser) {
        WebDriver webDriver;
        switch (browser.toLowerCase()) {
            case "chrome":
                webDriver = new ChromeDriver();
                break;
            case "firefox":
                webDriver = new FirefoxDriver();
                break;
            default:
                throw new IllegalArgumentException("Invalid browser");
        }
        driver.set(webDriver);
    }
    
    public static void quitDriver() {
        if (driver.get() != null) {
            driver.get().quit();
            driver.remove();
        }
    }
}
```

**3. Page Objects:**
- One class per page
- Elements and actions encapsulated

**4. Utilities:**
```java
public class WaitUtils {
    public static WebElement waitForElement(WebDriver driver, By locator, int timeout) {
        return new WebDriverWait(driver, Duration.ofSeconds(timeout))
            .until(ExpectedConditions.visibilityOfElementLocated(locator));
    }
}

public class ScreenshotUtils {
    public static void takeScreenshot(WebDriver driver, String fileName) {
        File src = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
        FileUtils.copyFile(src, new File("screenshots/" + fileName + ".png"));
    }
}
```

**5. Test Data Management:**
- Excel files
- JSON/YAML files
- Database
- Data providers

**6. Reporting:**
- ExtentReports
- Allure
- TestNG reports

---

#### Q30: What is Hybrid Framework?
**Answer:**

Hybrid Framework combines multiple framework approaches.

**Components:**
1. **Data-Driven:** External test data
2. **Keyword-Driven:** Actions as keywords
3. **POM:** Page objects for pages
4. **BDD:** Gherkin for business scenarios

**Structure:**
```
src/
├── main/
│   └── java/
│       ├── pages/
│       │   ├── LoginPage.java
│       │   └── DashboardPage.java
│       ├── utils/
│       │   ├── ConfigReader.java
│       │   ├── DriverManager.java
│       │   └── ExcelUtils.java
│       └── constants/
│           └── Constants.java
├── test/
│   ├── java/
│   │   ├── tests/
│   │   │   └── LoginTest.java
│   │   ├── stepDefs/
│   │   │   └── LoginSteps.java
│   │   └── runners/
│   │       └── TestRunner.java
│   └── resources/
│       ├── features/
│       │   └── login.feature
│       └── testdata/
│           └── testdata.xlsx
├── config/
│   └── config.properties
└── reports/
```

---

## CI/CD Integration

### Q31: How do you integrate Selenium tests with Jenkins?
**Answer:**

**1. Maven Project Setup (pom.xml):**
```xml
<project>
    <dependencies>
        <dependency>
            <groupId>org.seleniumhq.selenium</groupId>
            <artifactId>selenium-java</artifactId>
            <version>4.x.x</version>
        </dependency>
        <dependency>
            <groupId>org.testng</groupId>
            <artifactId>testng</artifactId>
            <version>7.x.x</version>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <configuration>
                    <suiteXmlFiles>
                        <suiteXmlFile>testng.xml</suiteXmlFile>
                    </suiteXmlFiles>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

**2. Jenkins Configuration:**
- Create new job
- Configure Git repository
- Add build step: `mvn clean test`
- Configure post-build actions for reports

**3. Headless Execution:**
```java
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless");
options.addArguments("--no-sandbox");
options.addArguments("--disable-dev-shm-usage");
WebDriver driver = new ChromeDriver(options);
```

---

## Real Interview Scenario Questions

### Scenario 1: Element is present but click is not working. What do you do?
**Answer:**

**Troubleshooting steps:**

1. **Wait for element to be clickable:**
```java
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.elementToBeClickable(By.id("btn"))).click();
```

2. **Scroll to element:**
```java
JavascriptExecutor js = (JavascriptExecutor) driver;
js.executeScript("arguments[0].scrollIntoView(true);", element);
```

3. **JavaScript click:**
```java
js.executeScript("arguments[0].click();", element);
```

4. **Check for overlay:**
```java
// Wait for overlay to disappear
wait.until(ExpectedConditions.invisibilityOfElementLocated(By.cssSelector(".overlay")));
```

5. **Actions class:**
```java
Actions actions = new Actions(driver);
actions.moveToElement(element).click().perform();
```

---

### Scenario 2: How do you handle StaleElementReferenceException?
**Answer:**

```java
// Option 1: Re-find the element
try {
    element.click();
} catch (StaleElementReferenceException e) {
    element = driver.findElement(By.id("myElement"));
    element.click();
}

// Option 2: Custom retry method
public void clickWithRetry(By locator, int retries) {
    for (int i = 0; i < retries; i++) {
        try {
            driver.findElement(locator).click();
            return;
        } catch (StaleElementReferenceException e) {
            // Element became stale, retry
        }
    }
    throw new RuntimeException("Element still stale after " + retries + " retries");
}

// Option 3: FluentWait
Wait<WebDriver> wait = new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(10))
    .pollingEvery(Duration.ofMillis(500))
    .ignoring(StaleElementReferenceException.class);

wait.until(d -> {
    d.findElement(locator).click();
    return true;
});
```

---

### Scenario 3: How do you design a maintainable automation framework?
**Answer:**

**Principles:**

1. **Separation of Concerns:**
   - Page objects separate from tests
   - Configuration separate from code
   - Test data separate from tests

2. **DRY (Don't Repeat Yourself):**
   - Reusable utility methods
   - Base test class for common setup

3. **Single Responsibility:**
   - Each class has one purpose
   - Each method does one thing

4. **Maintainable Locators:**
   - Use data-testid attributes
   - Avoid brittle XPaths
   - Centralize locators

5. **Proper Waits:**
   - Explicit waits over implicit
   - Never use Thread.sleep in production

6. **Logging and Reporting:**
   - Comprehensive logging
   - Screenshots on failure
   - Detailed reports

---

## Quick Reference

### Common Exceptions and Solutions:

| Exception | Cause | Solution |
|-----------|-------|----------|
| NoSuchElementException | Element not found | Check locator, add wait |
| StaleElementReferenceException | DOM changed | Re-find element |
| TimeoutException | Wait exceeded | Increase timeout, check condition |
| ElementNotInteractableException | Element not visible/enabled | Wait for clickable, scroll |
| ElementClickInterceptedException | Another element blocking | Wait for overlay, JS click |

---

Continue to [06_Java_For_Testers.md](06_Java_For_Testers.md) for Java concepts and coding problems.
