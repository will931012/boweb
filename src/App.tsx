import { DashboardHeader } from './components/layout/DashboardHeader'
import { ContributionModal } from './components/modals/ContributionModal'
import { useAppController } from './hooks/useAppController'
import { AccessRoute } from './routes/AccessRoute'
import { AdminRoute } from './routes/AdminRoute'
import { MemberRoute } from './routes/MemberRoute'

function App() {
  const controller = useAppController()

  if (!controller.currentUser) {
    return (
      <AccessRoute
        mode={controller.mode}
        firstName={controller.firstName}
        lastName={controller.lastName}
        stateId={controller.stateId}
        headline={controller.headline}
        helperCopy={controller.helperCopy}
        stats={controller.stats}
        demoUsers={controller.demoUsers}
        submittedMessage={controller.submittedMessage}
        errorMessage={controller.errorMessage}
        isLoading={controller.isLoading}
        isSubmitting={controller.isSubmitting}
        onModeChange={controller.setMode}
        onFirstNameChange={controller.setFirstName}
        onLastNameChange={controller.setLastName}
        onStateIdChange={controller.setStateId}
        onSubmit={controller.handleSubmit}
      />
    )
  }

  return (
    <>
      <DashboardHeader
        currentUser={controller.currentUser}
        route={controller.route}
        isRouteSwitching={controller.isRouteSwitching}
        onNavigate={controller.navigateTo}
        onLogout={controller.handleLogout}
      >
        {controller.route === '/admin' ? (
          <AdminRoute
            currentUser={controller.currentUser}
            account={controller.account}
            adminMembers={controller.adminMembers}
            pendingApprovals={controller.pendingApprovals}
            adminExpenses={controller.adminExpenses}
            accountMessage={controller.accountMessage}
            accountError={controller.accountError}
            expenseAmount={controller.expenseAmount}
            expenseReason={controller.expenseReason}
            isLoadingAdminTable={controller.isLoadingAdminTable}
            isLoadingAdminApprovals={controller.isLoadingAdminApprovals}
            isLoadingAdminExpenses={controller.isLoadingAdminExpenses}
            isRegisteringExpense={controller.isRegisteringExpense}
            resendingExpenseId={controller.resendingExpenseId}
            reviewingContributionKey={controller.reviewingContributionKey}
            onReviewContribution={controller.handleReviewContribution}
            onExpenseAmountChange={controller.setExpenseAmount}
            onExpenseReasonChange={controller.setExpenseReason}
            onExpenseSubmit={controller.handleExpenseSubmit}
            onResendExpenseMessage={controller.handleResendExpenseMessage}
          />
        ) : (
          <MemberRoute
            currentUser={controller.currentUser}
            account={controller.account}
            recentPayments={controller.recentPayments}
            accountMessage={controller.accountMessage}
            accountError={controller.accountError}
            isLoadingAccount={controller.isLoadingAccount}
            isRegisteringPayment={controller.isRegisteringPayment}
            onOpenContributionModal={controller.openContributionModal}
          />
        )}
      </DashboardHeader>

      {controller.route === '/' && controller.isContributionModalOpen ? (
        <ContributionModal
          account={controller.account}
          includeWeeklyContribution={controller.includeWeeklyContribution}
          includeExtraContribution={controller.includeExtraContribution}
          extraContributionAmount={controller.extraContributionAmount}
          weeklyButtonLabel={controller.weeklyButtonLabel}
          isRegisteringPayment={controller.isRegisteringPayment}
          onClose={controller.closeContributionModal}
          onSubmit={controller.handleContributionSubmit}
          onWeeklyChange={controller.setIncludeWeeklyContribution}
          onExtraChange={controller.setIncludeExtraContribution}
          onExtraAmountChange={controller.setExtraContributionAmount}
        />
      ) : null}
    </>
  )
}

export default App
