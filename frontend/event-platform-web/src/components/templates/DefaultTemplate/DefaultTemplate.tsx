import { MainLayout } from '../../organisms/MainLayout'

export interface DefaultTemplateProps {
  children: React.ReactNode
}

export function DefaultTemplate({ children }: DefaultTemplateProps) {
  return <MainLayout>{children}</MainLayout>
}
