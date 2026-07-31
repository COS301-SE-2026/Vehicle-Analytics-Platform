import BrandFoundation from '@/components/styleguide/BrandFoundation'
import LogoIconography from '@/components/styleguide/LogoIconography'
import ColourPalette from '@/components/styleguide/ColourPalette'
import Typography from '@/components/styleguide/Typography'
import DesignTokens from '@/components/styleguide/DesignTokens'
import ComponentLibrary from '@/components/styleguide/ComponentLibrary'
import ShadowAndMotion from '@/components/styleguide/ShadowAndMotion'
import ResponsiveBreakpoints from '@/components/styleguide/ResponsiveBreakpoints'
import Accessibility from '@/components/styleguide/Accessibility'
import ChangeLog from '@/components/styleguide/Changelog'

import {useEffect, useRef, useState} from 'react'
import {ChevronLeft, ChevronRight} from'lucide-react'

const SECTIONS = [
    {id: 'foundation', label: 'Brand Foundation'},
    {id: 'logo', label: 'Logo & Iconography'},
    {id: 'colour', label: 'Colour Palette'},
    {id: 'typography', label: 'Typography'},
    {id: 'tokens', label: 'Design Tokens'},
    {id: 'components', label: 'Component Library'},
    {id: 'shadow-motion', label: 'Shadow and motion'},
    {id: 'breakpoints', label: 'Layout & Spacing'},
    {id: 'accessibility', label: 'Accessibility'},
    {id: 'changelog', label: 'ChangeLog'},
]

export default function BrandStyleGuide(){
    const [collapsed, setCollapsed] = useState(false)
    const [activeId, setActiveId] = useState(SECTIONS[0].id)
    const observerRef = useRef(null)

        useEffect(() => {
            const sectionEls = SECTIONS
                .map((s) => document.getElementById(s.id))
                .filter(Boolean)

            observerRef.current = new IntersectionObserver(
                (entries) => {
                    const visible = entries
                        .filter((e) => e.isIntersecting)
                        .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)

                        if (visible[0]) {
                            setActiveId(visible[0].target.id)
                        }
                },
                { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
            )

            sectionEls.forEach((el) => observerRef.current.observe(el))
            return () => observerRef.current?.disconnect()
        }, [])

        return (
            <div className="min-h-screen bg-fleet-bg">
                <aside className={`${collapsed ? 'w-[64px]' : 'w-[220px]'} min-h-screen bg-fleet-surface flex flex-col py-6 px-3 fixed left-0 top-0 transition-all duration-300 z-20`}>
                <div className="flex items-center justify-between mb-10 px-1">
                    {!collapsed && (
                        <div className="flex-items-center gap-3 w-full justify-center">
                            <span className="text-fleet-blue font-bold text-2xl">V.A.P.O.R.</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setCollapsed((c) => !c)}
                        className="w-7 h-7 items-center justify-center rounded-lg bg-fleet-blue hover:bg-fleet-blue/80 transition-colors ml-auto"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                            {collapsed ? (
                                <ChevronRight className="w-4 h-4 text-white"></ChevronRight>
                            ) : (
                                <ChevronLeft className="w-4 h-4 text-white"></ChevronLeft>
                            )}
                        </button>
                </div>

                <nav className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
                    {SECTIONS.map((s) => {
                        const isActive = activeId === s.id
                        return (
                            <a
                            key={s.id}
                            href={`#${s.id}`}
                            title={collapsed ? s.label : ''}
                            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 ${
                                isActive
                                    ? 'bg-fleet-blue text-white'
                                    : 'text-fleet-blue hover:text-fleet-blue hover:bg-fleet-blue/10'
                            } ${collapsed ? 'justify-center' : ''
                            }`}>
                                {!collapsed && (
                                    <span className="font-sans text-sm font-medium truncate">{s.label}
                                    </span>
                                )}

                                {collapsed && (
                                    <span className="font-sans text-xs font-bold">{s.label.charAt(0)}</span>
                                )}
                            </a>
                        )
                    })}
                </nav>
                </aside>


                <main className={`${
                    collapsed ? 'ml-[64px]' : 'ml-[220px]'
                } transition-all duration-300 max-w-4xl px-6 py-12 space-y-20`}>
                    <header>
                        <h1 className="font-display font-bold text-3xl text-fleet-text">
                            V.A.P.O.R. Brand Style Guide
                        </h1>
                        <p className="text-fleet-secondary mt-2">Vehicle Analytics, Processing and Operations in Real Time</p>
                    </header>
                    

                <section id="foundation"><BrandFoundation/></section>
                <section id="logo"><LogoIconography/></section>
                <section id="colour"><ColourPalette/></section>
                <section id="typography"><Typography/></section>
                <section id="tokens"><DesignTokens/></section>
                <section id="components"><ComponentLibrary/></section>
                <section id="shadow-motion"><ShadowAndMotion/></section>
                <section id="breakpoints"><ResponsiveBreakpoints/></section>
                <section id="accessibility"><Accessibility/></section>
                <section id="changelog"><ChangeLog/></section>
            </main>
            </div>
        )
    
}