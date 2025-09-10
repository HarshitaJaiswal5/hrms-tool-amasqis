import { Navigate, Route } from "react-router";
import { all_routes } from "./all_routes";
import Countries from "../content/location/countries";
import DataTable from "../tables/dataTable";
import BasicTable from "../tables/basicTable";
import DeleteRequest from "../userManagement/deleteRequest";
import Membershipplan from "../membership/membershipplan";
import MembershipAddon from "../membership/membershipaddon";
import Notes from "../application/notes";
import ComingSoon from "../pages/comingSoon";
import Login from "../auth/login/login";
import Register from "../auth/register/register";
import TwoStepVerification from "../auth/twoStepVerification/twoStepVerification";
import EmailVerification from "../auth/emailVerification/emailVerification";
import ResetPassword from "../auth/resetPassword/resetPassword";
import ForgotPassword from "../auth/forgotPassword/forgotPassword";
import Accordion from "../uiInterface/base-ui/accordion";
import Avatar from "../uiInterface/base-ui/avatar";
import Borders from "../uiInterface/base-ui/borders";
import Breadcrumb from "../uiInterface/base-ui/breadcrumb";
import Buttons from "../uiInterface/base-ui/buttons";
import ButtonsGroup from "../uiInterface/base-ui/buttonsgroup";
import Cards from "../uiInterface/base-ui/cards";
import Carousel from "../uiInterface/base-ui/carousel";
import Colors from "../uiInterface/base-ui/colors";
import Dropdowns from "../uiInterface/base-ui/dropdowns";
import Grid from "../uiInterface/base-ui/grid";
import Images from "../uiInterface/base-ui/images";
import Lightboxes from "../uiInterface/base-ui/lightbox";
import Media from "../uiInterface/base-ui/media";
import Modals from "../uiInterface/base-ui/modals";
import NavTabs from "../uiInterface/base-ui/navtabs";
import Offcanvas from "../uiInterface/base-ui/offcanvas";
import Pagination from "../uiInterface/base-ui/pagination";
import Popovers from "../uiInterface/base-ui/popover";
import RangeSlides from "../uiInterface/base-ui/rangeslider";
import Progress from "../uiInterface/base-ui/progress";
import Spinner from "../uiInterface/base-ui/spinner";
import Toasts from "../uiInterface/base-ui/toasts";
import Typography from "../uiInterface/base-ui/typography";
import Video from "../uiInterface/base-ui/video";
import Error404 from "../pages/error/error-404";
import Error500 from "../pages/error/error-500";
import UnderMaintenance from "../pages/underMaintenance";
import Email from "../application/email";
import Chat from "../application/chat";
import FunctionalChat from "../application/functional-chat";
import CallHistory from "../application/call/callHistory";
import FileManager from "../application/fileManager";
import MembershipTransaction from "../membership/membershiptrasaction";
import ClipBoard from "../uiInterface/advanced-ui/clipboard";
import Counter from "../uiInterface/advanced-ui/counter";
import DragAndDrop from "../uiInterface/advanced-ui/dragdrop";
import Rating from "../uiInterface/advanced-ui/rating";
import Stickynote from "../uiInterface/advanced-ui/stickynote";
import TextEditor from "../uiInterface/advanced-ui/texteditor";
import Timeline from "../uiInterface/advanced-ui/timeline";
import Scrollbar from "../uiInterface/advanced-ui/uiscrollbar";
import Apexchart from "../uiInterface/charts/apexcharts";
import FeatherIcons from "../uiInterface/icons/feathericon";
import FontawesomeIcons from "../uiInterface/icons/fontawesome";
import MaterialIcons from "../uiInterface/icons/materialicon";
import PE7Icons from "../uiInterface/icons/pe7icons";
import SimplelineIcons from "../uiInterface/icons/simplelineicon";
import ThemifyIcons from "../uiInterface/icons/themify";
import TypiconIcons from "../uiInterface/icons/typicons";
import WeatherIcons from "../uiInterface/icons/weathericons";
import BasicInputs from "../uiInterface/forms/formelements/basic-inputs";
import CheckboxRadios from "../uiInterface/forms/formelements/checkbox-radios";
import InputGroup from "../uiInterface/forms/formelements/input-group";
import GridGutters from "../uiInterface/forms/formelements/grid-gutters";
import FormSelect from "../uiInterface/forms/formelements/form-select";
import FormMask from "../uiInterface/forms/formelements/form-mask";
import FileUpload from "../uiInterface/forms/formelements/fileupload";
import FormHorizontal from "../uiInterface/forms/formelements/layouts/form-horizontal";
import FormVertical from "../uiInterface/forms/formelements/layouts/form-vertical";
import FloatingLabel from "../uiInterface/forms/formelements/layouts/floating-label";
import FormValidation from "../uiInterface/forms/formelements/layouts/form-validation";
import FormSelect2 from "../uiInterface/forms/formelements/layouts/form-select2";
import FormWizard from "../uiInterface/forms/formelements/form-wizard";
import DataTables from "../uiInterface/table/data-tables";
import TablesBasic from "../uiInterface/table/tables-basic";
import IonicIcons from "../uiInterface/icons/ionicicons";
import Badges from "../uiInterface/base-ui/badges";
import Placeholder from "../uiInterface/base-ui/placeholder";
import Alert from "../uiInterface/base-ui/alert";
import Tooltips from "../uiInterface/base-ui/tooltips";
import Ribbon from "../uiInterface/advanced-ui/ribbon";
import AdminDashboard from "../mainMenu/adminDashboard";
import AlertUi from "../uiInterface/base-ui/alert-ui";

import Login2 from "../auth/login/login-2";
import Login3 from "../auth/login/login-3";
import ResetPassword2 from "../auth/resetPassword/resetPassword-2";
import ResetPassword3 from "../auth/resetPassword/resetPassword-3";
import TwoStepVerification2 from "../auth/twoStepVerification/twoStepVerification-2";
import TwoStepVerification3 from "../auth/twoStepVerification/twoStepVerification-3";
import Register2 from "../auth/register/register-2";
import Register3 from "../auth/register/register-3";
import ForgotPassword2 from "../auth/forgotPassword/forgotPassword-2";
import ForgotPassword3 from "../auth/forgotPassword/forgotPassword-3";
import ResetPasswordSuccess from "../auth/resetPasswordSuccess/resetPasswordSuccess";
import ResetPasswordSuccess2 from "../auth/resetPasswordSuccess/resetPasswordSuccess-2";
import ResetPasswordSuccess3 from "../auth/resetPasswordSuccess/resetPasswordSuccess-3";

import RolesPermissions from "../userManagement/rolesPermissions";
import Permission from "../userManagement/permission";
import Manageusers from "../userManagement/manageusers";
import Profilesettings from "../settings/generalSettings/profile-settings";
import Securitysettings from "../settings/generalSettings/security-settings";
import Notificationssettings from "../settings/generalSettings/notifications-settings";
import ConnectedApps from "../settings/generalSettings/connected-apps";
import Bussinesssettings from "../settings/websiteSettings/bussiness-settings";
import Seosettings from "../settings/websiteSettings/seo-settings";
import CompanySettings from "../settings/websiteSettings/companySettings";
import Localizationsettings from "../settings/websiteSettings/localization-settings";
import Prefixes from "../settings/websiteSettings/prefixes";
import Preference from "../settings/websiteSettings/preferences";
import Authenticationsettings from "../settings/websiteSettings/authentication-settings";
import Languagesettings from "../settings/websiteSettings/language";
import InvoiceSettings from "../settings/appSettings/invoiceSettings";
import CustomFields from "../settings/appSettings/customFields";
import EmailSettings from "../settings/systemSettings/emailSettings";
import Emailtemplates from "../settings/systemSettings/email-templates";
import SmsSettings from "../settings/systemSettings/smsSettings";
import OtpSettings from "../settings/systemSettings/otp-settings";
import GdprCookies from "../settings/systemSettings/gdprCookies";
import PaymentGateways from "../settings/financialSettings/paymentGateways";
import TaxRates from "../settings/financialSettings/taxRates";
import Storage from "../settings/otherSettings/storage";
import BanIpAddress from "../settings/otherSettings/banIpaddress";
import BlogCategories from "../content/blog/blogCategories";
import BlogComments from "../content/blog/blogComments";
import BlogTags from "../content/blog/blogTags";
import Faq from "../content/faq";
import Cities from "../content/location/cities";
import States from "../content/location/states";
import Testimonials from "../content/testimonials";
import Profile from "../pages/profile";
import LockScreen from "../auth/lockScreen";
import EmailVerification2 from "../auth/emailVerification/emailVerification-2";
import EmailVerification3 from "../auth/emailVerification/emailVerification-3";
import EmployeeDashboard from "../mainMenu/employeeDashboard/employee-dashboard";
import LeadsDasboard from "../mainMenu/leadsDashboard";
import DealsDashboard from "../mainMenu/dealsDashboard";
import Leaflet from "../uiInterface/map/leaflet";
import BootstrapIcons from "../uiInterface/icons/bootstrapicons";
import RemixIcons from "../uiInterface/icons/remixIcons";
import FlagIcons from "../uiInterface/icons/flagicons";
import Swiperjs from "../uiInterface/base-ui/swiperjs";
import Sortable from "../uiInterface/base-ui/ui-sortable";
import PrimeReactChart from "../uiInterface/charts/prime-react-chart";
import ChartJSExample from "../uiInterface/charts/chartjs";
import FormPikers from "../uiInterface/forms/formelements/formpickers";
import VoiceCall from "../application/call/voiceCall";
import Videocallss from "../application/call/videocalls";
import OutgoingCalls from "../application/call/outgingcalls";
import IncomingCall from "../application/call/incomingcall";
import Calendars from "../mainMenu/apps/calendar";
import SocialFeed from "../application/socialfeed";
import KanbanView from "../application/kanbanView";
import Todo from "../application/todo/todo";
import TodoList from "../application/todo/todolist";
import StarterPage from "../pages/starter";
import SearchResult from "../pages/search-result";
import TimeLines from "../pages/timeline";
import Pricing from "../pages/pricing";
import ApiKeys from "../pages/api-keys";
import UnderConstruction from "../pages/underConstruction";
import PrivacyPolicy from "../pages/privacy-policy";
import TermsCondition from "../pages/terms-condition";
import Gallery from "../pages/gallery";
import EmailReply from "../application/emailReply";
import Blogs from "../content/blog/blogs";
import Page from "../content/page";
import Assets from "../administration/asset";
import AssetsCategory from "../administration/asset-category";
import Knowledgebase from "../administration/help-support/knowledgebase";
import Activity from "../crm/activities/activity";
import Users from "../administration/user-management/users";
import RolesPermission from "../administration/user-management/rolePermission";
import Categories from "../accounting/categories";
import Budgets from "../accounting/budgets";
import BudgetExpenses from "../accounting/budget-expenses";
import BudgetRevenues from "../accounting/budget-revenues";
import Appearance from "../settings/websiteSettings/appearance";
import SuperAdminDashboard from "../super-admin/dashboard";
import LayoutDemo from "../mainMenu/layout-dashoard";
import ExpensesReport from "../administration/reports/expensereport";
import InvoiceReport from "../administration/reports/invoicereport";
import PaymentReport from "../administration/reports/paymentreport";
import ProjectReport from "../administration/reports/projectreport";
import InvoiceDetails from "../sales/invoiceDetails";
import TaskReport from "../administration/reports/taskreport";
import UserReports from "../administration/reports/userreports";
import EmployeeReports from "../administration/reports/employeereports";
import EmployeeDetails from "../hrm/employees/employeedetails";
import PayslipReport from "../administration/reports/payslipreport";
import AttendanceReport from "../administration/reports/attendencereport";
import LeaveReport from "../administration/reports/leavereport";
import DailyReport from "../administration/reports/dailyreport";
import PermissionPage from "../administration/user-management/permissionpage";
import JobGrid from "../recruitment/jobs/jobgrid";
import JobList from "../recruitment/joblist/joblist";
import CandidateGrid from "../recruitment/candidates/candidategrid";
import CandidateKanban from "../recruitment/candidates/candidatekanban";
import CandidatesList from "../recruitment/candidates/candidatelist";
import RefferalList from "../recruitment/refferal/refferallist";
import ClienttGrid from "../projects/client/clienttgrid";
import ClientList from "../projects/client/clientlist";
import ClientDetails from "../projects/client/clientdetails";
import Project from "../projects/project/project";
import ProjectDetails from "../projects/project/projectdetails";
import ProjectList from "../projects/project/projectlist";
import Task from "../projects/task/task";
import TaskDetails from "../projects/task/taskdetails";
import TaskBoard from "../projects/task/task-board";
import Extimates from "../finance-accounts/sales/estimates";
import AddInvoice from "../finance-accounts/sales/add_invoices";
import EditInvoice from "../finance-accounts/payrool/payslip";
import Payments from "../finance-accounts/sales/payment";
import Expenses from "../finance-accounts/sales/expenses";
import ProvidentFund from "../finance-accounts/sales/provident_fund";
import Taxes from "../finance-accounts/sales/taxes";
import EmployeeSalary from "../finance-accounts/payrool/employee_salary";
import PaySlip from "../finance-accounts/payrool/payslip";
import PayRoll from "../finance-accounts/payrool/payroll";
import PayRollOvertime from "../finance-accounts/payrool/payrollOvertime";
import PayRollDeduction from "../finance-accounts/payrool/payrollDedution";
import Tickets from "../tickets/tickets";
import TicketGrid from "../tickets/tickets-grid";
import TicketDetails from "../tickets/ticket-details";
import PerformanceIndicator from "../performance/performanceIndicator";
import Aisettings from "../settings/websiteSettings/ai-settings";
import Salarysettings from "../settings/appSettings/salary-settings";
import Approvalsettings from "../settings/appSettings/approval-settings";
import LeaveType from "../settings/appSettings/leave-type";
import SmsTemplate from "../settings/systemSettings/sms-template";
import Maintenancemode from "../settings/systemSettings/maintenance-mode";
import Currencies from "../settings/financialSettings/currencies";
import Customcss from "../settings/otherSettings/custom-css";
import Customjs from "../settings/otherSettings/custom-js";
import Cronjob from "../settings/otherSettings/cronjob";
import Cronjobschedule from "../settings/otherSettings/cronjobSchedule";
import Backup from "../settings/otherSettings/backup";
import Clearcache from "../settings/otherSettings/clearCache";
import Languageweb from "../settings/websiteSettings/language-web";
import Addlanguage from "../settings/websiteSettings/add-language";
import EmployeeList from "../hrm/employees/employeesList";
import EmployeesGrid from "../hrm/employees/employeesGrid";
import Department from "../hrm/employees/deparment";
import Designations from "../hrm/employees/designations";
import Policy from "../hrm/employees/policy";
import CompaniesGrid from "../crm/companies/companiesGrid";
import ContactDetails from "../crm/contacts/contactDetails";
import ContactList from "../crm/contacts/contactList";
import ContactGrid from "../crm/contacts/contactGrid";
import CompaniesList from "../crm/companies/companiesList";
import CompaniesDetails from "../crm/companies/companiesDetails";
import LeadsGrid from "../crm/leads/leadsGrid";
import LeadsList from "../crm/leads/leadsList";
import LeadsDetails from "../crm/leads/leadsDetails";
import DealsGrid from "../crm/deals/dealsGrid";
import DealsList from "../crm/deals/dealsList";
import DealsDetails from "../crm/deals/dealsDetails";
import Pipeline from "../crm/pipeline/pipeline";
import Analytics from "../crm/analytics/analytics";
import Holidays from "../hrm/holidays";
import PerformanceReview from "../performance/performanceReview";
import PerformanceAppraisal from "../performance/performanceAppraisal";
import GoalTracking from "../performance/goalTracking";
import GoalType from "../performance/goalType";

import LeaveAdmin from "../hrm/attendance/leaves/leaveAdmin";
import LeaveEmployee from "../hrm/attendance/leaves/leaveEmployee";
import LeaveSettings from "../hrm/attendance/leaves/leavesettings";
import AttendanceAdmin from "../hrm/attendance/attendanceadmin";
import AttendanceEmployee from "../hrm/attendance/attendance_employee";
import TimeSheet from "../hrm/attendance/timesheet";
import ScheduleTiming from "../hrm/attendance/scheduletiming";
import OverTime from "../hrm/attendance/overtime";
import Companies from "../super-admin/companies";
import Subscription from "../super-admin/subscription";
import Packages from "../super-admin/packages/packagelist";
import PackageGrid from "../super-admin/packages/packagelist";
import TrainingType from "../training/trainingType";
import Domain from "../super-admin/domin";
import PurchaseTransaction from "../super-admin/purchase-transaction";
import Termination from "../hrm/termination";
import Resignation from "../hrm/resignation";
import Promotion from "../hrm/promotion";
import Trainers from "../training/trainers";
import TrainingList from "../training/trainingList";
import Invoices from "../finance-accounts/sales/invoices";

// Custom route
import Validate from "../auth/login/validate";
import ClerkDash from "../clerk/Clerkdash";
const routes = all_routes;

export const publicRoutes = [
  {
    path: "/",
    name: "Root",
    element: <Navigate to="/validate" />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.adminDashboard,
    element: <AdminDashboard />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.employeeDashboard,
    element: <EmployeeDashboard />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leadsDashboard,
    element: <LeadsDasboard />,
    route: Route,
    roles: ["lead"],
  },
  {
    path: routes.dealsDashboard,
    element: <DealsDashboard />,
    route: Route,
    roles: ["deal"],
  },
  {
    path: routes.validate,
    element: <Validate />,
    roles: ["public"],
  },
  {
    path: routes.clerk,
    element: <ClerkDash />,
    roles: ["admin"],
  },
  {
    path: routes.estimate,
    element: <Extimates />,
    roles: ["hr"],
  },
  {
    path: routes.termination,
    element: <Termination />,
    roles: ["hr"],
  },
  {
    path: routes.resignation,
    element: <Resignation />,
    roles: ["hr"],
  },
  {
    path: routes.promotion,
    element: <Promotion />,
    roles: ["hr"],
  },
  {
    path: routes.trainingType,
    element: <TrainingType />,
    roles: ["hr"],
  },
  {
    path: routes.trainers,
    element: <Trainers />,
    roles: ["hr"],
  },
  {
    path: routes.trainingList,
    element: <TrainingList />,
    roles: ["hr"],
  },

  //Application
  {
    path: routes.chat,
    element: <FunctionalChat />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.voiceCall,
    element: <VoiceCall />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.videoCall,
    element: <Videocallss />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.outgoingCall,
    element: <OutgoingCalls />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.incomingCall,
    element: <IncomingCall />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.callHistory,
    element: <CallHistory />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.socialFeed,
    element: <SocialFeed />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.kanbanView,
    element: <KanbanView />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.countries,
    element: <Countries />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.starter,
    element: <StarterPage />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.calendar,
    element: <Calendars />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.superAdminDashboard,
    element: <SuperAdminDashboard />,
    route: Route,
    roles: ["superadmin"],
  },

  {
    path: routes.membershipplan,
    element: <Membershipplan />,
    roles: ["public"],
  },
  {
    path: routes.membershipAddon,
    element: <MembershipAddon />,
    roles: ["public"],
  },
  {
    path: routes.membershipTransaction,
    element: <MembershipTransaction />,
    roles: ["public"],
  },
  {
    path: routes.notes,
    element: <Notes />,
    roles: ["public"],
  },
  {
    path: routes.countries,
    element: <Countries />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.customFields,
    element: <CustomFields />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dataTables,
    element: <DataTable />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.tablesBasic,
    element: <BasicTable />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.deleteRequest,
    element: <DeleteRequest />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.cities,
    element: <Cities />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.accordion,
    element: <Accordion />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.avatar,
    element: <Avatar />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.badges,
    element: <Badges />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.border,
    element: <Borders />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.breadcrums,
    element: <Breadcrumb />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.button,
    element: <Buttons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.buttonGroup,
    element: <ButtonsGroup />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.cards,
    element: <Cards />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.carousel,
    element: <Carousel />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.colors,
    element: <Colors />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dropdowns,
    element: <Dropdowns />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.grid,
    element: <Grid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.images,
    element: <Images />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.lightbox,
    element: <Lightboxes />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.media,
    element: <Media />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.modals,
    element: <Modals />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.navTabs,
    element: <NavTabs />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.offcanvas,
    element: <Offcanvas />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.pagination,
    element: <Pagination />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.popover,
    element: <Popovers />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.rangeSlider,
    element: <RangeSlides />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.progress,
    element: <Progress />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.spinner,
    element: <Spinner />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.typography,
    element: <Typography />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.video,
    element: <Video />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.sortable,
    element: <Sortable />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.swiperjs,
    element: <Swiperjs />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.bootstrapIcons,
    element: <BootstrapIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.toasts,
    element: <Toasts />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.mapLeaflet,
    element: <Leaflet />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.RemixIcons,
    element: <RemixIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.FlagIcons,
    element: <FlagIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.banIpAddress,
    element: <BanIpAddress />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.todo,
    element: <Todo />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.TodoList,
    element: <TodoList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.email,
    element: <Email />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.EmailReply,
    element: <EmailReply />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.chat,
    element: <FunctionalChat />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.pages,
    element: <Page />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.fileManager,
    element: <FileManager />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.faq,
    element: <Faq />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.states,
    element: <States />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.testimonials,
    element: <Testimonials />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.clipboard,
    element: <ClipBoard />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.counter,
    element: <Counter />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dragandDrop,
    element: <DragAndDrop />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.rating,
    element: <Rating />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.stickyNotes,
    element: <Stickynote />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.textEditor,
    element: <TextEditor />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.timeLine,
    element: <Timeline />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.scrollBar,
    element: <Scrollbar />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.apexChart,
    element: <Apexchart />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.primeChart,
    element: <PrimeReactChart />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.chartJs,
    element: <ChartJSExample />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.featherIcons,
    element: <FeatherIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.fontawesome,
    element: <FontawesomeIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.materialIcon,
    element: <MaterialIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.pe7icon,
    element: <PE7Icons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.simpleLineIcon,
    element: <SimplelineIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.themifyIcon,
    element: <ThemifyIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.typicon,
    element: <TypiconIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.basicInput,
    element: <BasicInputs />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.weatherIcon,
    element: <WeatherIcons />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.checkboxandRadion,
    element: <CheckboxRadios />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.inputGroup,
    element: <InputGroup />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.gridandGutters,
    element: <GridGutters />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.formSelect,
    element: <FormSelect />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.formMask,
    element: <FormMask />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.fileUpload,
    element: <FileUpload />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.horizontalForm,
    element: <FormHorizontal />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.verticalForm,
    element: <FormVertical />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.floatingLable,
    element: <FloatingLabel />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.formValidation,
    element: <FormValidation />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.reactSelect,
    element: <FormSelect2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.formWizard,
    element: <FormWizard />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.formPicker,
    element: <FormPikers />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dataTables,
    element: <DataTables />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.tablesBasic,
    element: <TablesBasic />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.iconicIcon,
    element: <IonicIcons />,
    route: Route,
    roles: ["public"],
  },
  // {
  //   path: routes.chart,
  //   element: <ChartJs />,
  //   route: Route,
  // },

  {
    path: routes.placeholder,
    element: <Placeholder />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.sweetalert,
    element: <Alert />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.alert,
    element: <AlertUi />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.tooltip,
    element: <Tooltips />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.ribbon,
    element: <Ribbon />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.categories,
    element: <Categories />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.budgets,
    element: <Budgets />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.budgetexpenses,
    element: <BudgetExpenses />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.budgetrevenues,
    element: <BudgetRevenues />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.tickets,
    element: <Tickets />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.ticketGrid,
    element: <TicketGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.ticketDetails,
    element: <TicketDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.performanceIndicator,
    element: <PerformanceIndicator />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.holidays,
    element: <Holidays />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.performanceReview,
    element: <PerformanceReview />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.performanceAppraisal,
    element: <PerformanceAppraisal />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.goalTracking,
    element: <GoalTracking />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.goalType,
    element: <GoalType />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.trainingList,
    element: <TrainingList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.trainers,
    element: <Trainers />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.trainingType,
    element: <TrainingType />,
    route: Route,
    roles: ["public"],
  },

  {
    path: routes.Horizontal,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.Detached,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.Modern,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.TwoColumn,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.Hovered,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.layoutBox,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.HorizontalSingle,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.HorizontalOverlay,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.HorizontalBox,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.MenuAside,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.Transparent,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.WithoutHeader,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.layoutRtl,
    element: <LayoutDemo />,
    roles: ["public"],
  },
  {
    path: routes.layoutDark,
    element: <LayoutDemo />,
    roles: ["public"],
  },

  //Settings

  {
    path: routes.profilesettings,
    element: <Profilesettings />,
    roles: ["public"],
  },
  {
    path: routes.securitysettings,
    element: <Securitysettings />,
    roles: ["public"],
  },
  {
    path: routes.notificationssettings,
    element: <Notificationssettings />,
    roles: ["public"],
  },
  {
    path: routes.connectedApps,
    element: <ConnectedApps />,
    roles: ["public"],
  },
  {
    path: routes.bussinessSettings,
    element: <Bussinesssettings />,
    roles: ["public"],
  },
  {
    path: routes.seoSettings,
    element: <Seosettings />,
    roles: ["public"],
  },
  {
    path: routes.companySettings,
    element: <CompanySettings />,
    roles: ["public"],
  },
  {
    path: routes.localizationSettings,
    element: <Localizationsettings />,
    roles: ["public"],
  },
  {
    path: routes.prefixes,
    element: <Prefixes />,
    roles: ["public"],
  },
  {
    path: routes.preference,
    element: <Preference />,
    roles: ["public"],
  },
  {
    path: routes.authenticationSettings,
    element: <Authenticationsettings />,
    roles: ["public"],
  },
  {
    path: routes.aiSettings,
    element: <Aisettings />,
    roles: ["public"],
  },
  {
    path: routes.salarySettings,
    element: <Salarysettings />,
    roles: ["public"],
  },
  {
    path: routes.approvalSettings,
    element: <Approvalsettings />,
    roles: ["public"],
  },
  {
    path: routes.appearance,
    element: <Appearance />,
    roles: ["public"],
  },
  {
    path: routes.language,
    element: <Languagesettings />,
    roles: ["public"],
  },
  {
    path: routes.languageWeb,
    element: <Languageweb />,
    roles: ["public"],
  },
  {
    path: routes.addLanguage,
    element: <Addlanguage />,
    roles: ["public"],
  },
  {
    path: routes.invoiceSettings,
    element: <InvoiceSettings />,
    roles: ["public"],
  },
  {
    path: routes.customFields,
    element: <CustomFields />,
    roles: ["public"],
  },
  {
    path: routes.leaveType,
    element: <LeaveType />,
    roles: ["public"],
  },
  {
    path: routes.emailSettings,
    element: <EmailSettings />,
    roles: ["public"],
  },
  {
    path: routes.emailTemplates,
    element: <Emailtemplates />,
    roles: ["public"],
  },
  {
    path: routes.smsSettings,
    element: <SmsSettings />,
    roles: ["public"],
  },
  {
    path: routes.smsTemplate,
    element: <SmsTemplate />,
    roles: ["public"],
  },
  {
    path: routes.otpSettings,
    element: <OtpSettings />,
    roles: ["public"],
  },
  {
    path: routes.gdprCookies,
    element: <GdprCookies />,
    roles: ["public"],
  },
  {
    path: routes.maintenanceMode,
    element: <Maintenancemode />,
    roles: ["public"],
  },

  {
    path: routes.paymentGateways,
    element: <PaymentGateways />,
    roles: ["public"],
  },
  {
    path: routes.taxRates,
    element: <TaxRates />,
    roles: ["public"],
  },
  {
    path: routes.currencies,
    element: <Currencies />,
    roles: ["public"],
  },
  {
    path: routes.backup,
    element: <Backup />,
    roles: ["public"],
  },
  {
    path: routes.clearcache,
    element: <Clearcache />,
    roles: ["public"],
  },
  {
    path: routes.customCss,
    element: <Customcss />,
    roles: ["public"],
  },
  {
    path: routes.customJs,
    element: <Customjs />,
    roles: ["public"],
  },
  {
    path: routes.cronjob,
    element: <Cronjob />,
    roles: ["public"],
  },
  {
    path: routes.Cronjobschedule,
    element: <Cronjobschedule />,
    roles: ["public"],
  },
  {
    path: routes.storage,
    element: <Storage />,
    roles: ["public"],
  },
  {
    path: routes.rolesPermissions,
    element: <RolesPermissions />,
    roles: ["public"],
  },
  {
    path: routes.permissionpage,
    element: <PermissionPage />,
    roles: ["public"],
  },
  {
    path: routes.expensesreport,
    element: <ExpensesReport />,
    roles: ["public"],
  },
  {
    path: routes.invoicereport,
    element: <InvoiceReport />,
    roles: ["public"],
  },
  {
    path: routes.paymentreport,
    element: <PaymentReport />,
    roles: ["public"],
  },
  {
    path: routes.projectreport,
    element: <ProjectReport />,
    roles: ["public"],
  },
  {
    path: routes.manageusers,
    element: <Manageusers />,
    roles: ["public"],
  },
  {
    path: routes.blogs,
    element: <Blogs />,
    roles: ["public"],
  },
  {
    path: routes.blogCategories,
    element: <BlogCategories />,
    roles: ["public"],
    route: Route,
  },
  {
    path: routes.blogComments,
    element: <BlogComments />,
    roles: ["public"],
  },
  {
    path: routes.blogTags,
    element: <BlogTags />,
    roles: ["public"],
  },

  {
    path: routes.profile,
    element: <Profile />,
    roles: ["public"],
  },
  {
    path: routes.gallery,
    element: <Gallery />,
    roles: ["public"],
  },
  {
    path: routes.searchresult,
    element: <SearchResult />,
    roles: ["public"],
  },
  {
    path: routes.timeline,
    element: <TimeLines />,
    roles: ["public"],
  },
  {
    path: routes.pricing,
    element: <Pricing />,
    roles: ["public"],
  },
  {
    path: routes.apikey,
    element: <ApiKeys />,
    roles: ["public"],
  },

  {
    path: routes.privacyPolicy,
    element: <PrivacyPolicy />,
    roles: ["public"],
  },
  {
    path: routes.termscondition,
    element: <TermsCondition />,
    roles: ["public"],
  },
  {
    path: routes.assetList,
    element: <Assets />,
    roles: ["public"],
  },
  {
    path: routes.assetCategories,
    element: <AssetsCategory />,
    roles: ["public"],
  },
  {
    path: routes.knowledgebase,
    element: <Knowledgebase />,
    roles: ["public"],
  },
  {
    path: routes.activity,
    element: <Activity />,
    roles: ["public"],
  },
  {
    path: routes.users,
    element: <Users />,
    roles: ["public"],
  },
  {
    path: routes.rolePermission,
    element: <RolesPermission />,
    roles: ["public"],
  },
  {
    path: routes.permissionpage,
    element: <Permission />,
    roles: ["public"],
  },
  {
    path: routes.invoiceDetails,
    element: <InvoiceDetails />,
    roles: ["public"],
  },
  {
    path: routes.taskreport,
    element: <TaskReport />,
    roles: ["public"],
  },
  {
    path: routes.userreport,
    element: <UserReports />,
    roles: ["public"],
  },
  {
    path: routes.employeereport,
    element: <EmployeeReports />,
    roles: ["public"],
  },
  {
    path: routes.employeedetails,
    route: Route,
    element: <EmployeeDetails />,
    roles: ["public"],
  },
  {
    path: routes.payslipreport,
    element: <PayslipReport />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.attendancereport,
    element: <AttendanceReport />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leavereport,
    element: <LeaveReport />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dailyreport,
    element: <DailyReport />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.jobgrid,
    element: <JobGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.joblist,
    element: <JobList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.candidatesGrid,
    element: <CandidateGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.candidateslist,
    element: <CandidatesList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.candidateskanban,
    element: <CandidateKanban />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.refferal,
    element: <RefferalList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.clientgrid,
    element: <ClienttGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.clientlist,
    element: <ClientList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: "/clients-details/:clientId",
    element: <ClientDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.project,
    element: <Project />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.projectdetails,
    element: <ProjectDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.projectlist,
    element: <ProjectList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.tasks,
    element: <Task />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.tasksdetails,
    element: <TaskDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.taskboard,
    element: <TaskBoard />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.invoices,
    element: <Invoices />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.invoice,
    element: <Invoices />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.addinvoice,
    element: <AddInvoice />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.editinvoice,
    element: <EditInvoice />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.invoicesdetails,
    element: <InvoiceDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.payments,
    element: <Payments />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.expenses,
    element: <Expenses />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.providentfund,
    element: <ProvidentFund />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.taxes,
    element: <Taxes />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.employeesalary,
    element: <EmployeeSalary />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.payslip,
    element: <PaySlip />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.payrollAddition,
    element: <PayRoll />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.payrollOvertime,
    element: <PayRollOvertime />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.payrollDeduction,
    element: <PayRollDeduction />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.employeeList,
    element: <EmployeeList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.employeeGrid,
    element: <EmployeesGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.departments,
    element: <Department />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.designations,
    element: <Designations />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.policy,
    element: <Policy />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leaveadmin,
    element: <LeaveAdmin />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leaveemployee,
    element: <LeaveEmployee />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leavesettings,
    element: <LeaveSettings />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.attendanceadmin,
    element: <AttendanceAdmin />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.attendanceemployee,
    element: <AttendanceEmployee />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.timesheet,
    element: <TimeSheet />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.scheduletiming,
    element: <ScheduleTiming />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.overtime,
    element: <OverTime />,
    route: Route,
    roles: ["public"],
  },

  //crm
  {
    path: routes.contactList,
    element: <ContactList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.contactGrid,
    element: <ContactGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.contactDetails,
    element: <ContactDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.companiesGrid,
    element: <CompaniesGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.companiesList,
    element: <CompaniesList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.companiesDetails,
    element: <CompaniesDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leadsGrid,
    element: <LeadsGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leadsList,
    element: <LeadsList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.leadsDetails,
    element: <LeadsDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dealsGrid,
    element: <DealsGrid />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dealsList,
    element: <DealsList />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.dealsDetails,
    element: <DealsDetails />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.pipeline,
    element: <Pipeline />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.analytics,
    element: <Analytics />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.superAdminCompanies,
    element: <Companies />,
    route: Route,
    roles: ["superadmin"],
  },
  {
    path: routes.superAdminSubscriptions,
    element: <Subscription />,
    route: Route,
    roles: ["superadmin"],
  },
  {
    path: routes.superAdminPackages,
    element: <Packages />,
    route: Route,
    roles: ["superadmin"],
  },
  {
    path: routes.superAdminPackagesGrid,
    element: <PackageGrid />,
    route: Route,
    roles: ["Restricted-route"],
  },
  {
    path: routes.superAdminDomain,
    element: <Domain />,
    route: Route,
    roles: ["deletedpage"],
  },
  {
    path: routes.superAdminPurchaseTransaction,
    element: <PurchaseTransaction />,
    route: Route,
    roles: ["disabled-route"],
  },
];

export const authRoutes = [
  {
    path: routes.comingSoon,
    element: <ComingSoon />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.login,
    element: <Login />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.login2,
    element: <Login2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.login3,
    element: <Login3 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.register,
    element: <Register />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.twoStepVerification,
    element: <TwoStepVerification />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.twoStepVerification2,
    element: <TwoStepVerification2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.twoStepVerification3,
    element: <TwoStepVerification3 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.emailVerification,
    element: <EmailVerification />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.emailVerification2,
    element: <EmailVerification2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.emailVerification3,
    element: <EmailVerification3 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.register,
    element: <Register />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.register2,
    element: <Register2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.register3,
    element: <Register3 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.resetPassword,
    element: <ResetPassword />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.resetPassword2,
    element: <ResetPassword2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.resetPassword3,
    element: <ResetPassword3 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.forgotPassword,
    element: <ForgotPassword />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.forgotPassword2,
    element: <ForgotPassword2 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.forgotPassword3,
    element: <ForgotPassword3 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.error404,
    element: <Error404 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.error500,
    element: <Error500 />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.underMaintenance,
    element: <UnderMaintenance />,
    route: Route,
    roles: ["public"],
  },
  {
    path: routes.underConstruction,
    element: <UnderConstruction />,
    roles: ["public"],
  },
  {
    path: routes.lockScreen,
    element: <LockScreen />,
    roles: ["public"],
  },
  {
    path: routes.resetPasswordSuccess,
    element: <ResetPasswordSuccess />,
    roles: ["public"],
  },
  {
    path: routes.resetPasswordSuccess2,
    element: <ResetPasswordSuccess2 />,
    roles: ["public"],
  },
  {
    path: routes.resetPasswordSuccess3,
    element: <ResetPasswordSuccess3 />,
    roles: ["public"],
  },
];
