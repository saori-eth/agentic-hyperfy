/** @jsx jsx */
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Global, css, jsx } from '@emotion/react'

import { Phosphor } from './Phosphor'
import { Api } from './Api'
import { Auth } from './Auth'

import { isLive, isSDK } from '../core/config'
import { storage } from '../core/storage'
import { useViewport } from '../core/useViewport'

import { LogoIcon } from './SVGIcons'

import { Explore } from './Explore'
import { Home2 } from './Home2'
import { Worlds } from './Worlds'
import { World } from './World'
import { GameServers } from './GameServers'
import { LinkWallet } from './LinkWallet'
import { AuthHook } from './AuthHook'
import { NotFound } from './NotFound'

const MAINTENANCE = false

const canView = MAINTENANCE ? storage.get('guardian') === true : true

/**
 * api/index.js contains blacklisted world slugs (worldSlugBlacklist)
 */

export function App() {
  return (
    <>
      <Global
        styles={css`
          :root {
            --sat: env(safe-area-inset-top);
            --sab: env(safe-area-inset-bottom);
            --sal: env(safe-area-inset-left);
            --sar: env(safe-area-inset-right);
          }

          body {
            background: black;
          }

          html {
            font-family: NeueHaasGroteskDP, sans-serif;
            font-size: 16px;
            font-weight: 400;
            line-height: 1.4;
            ${'' /* background: #151617; */}
            background: #000000;
            color: white;
            -webkit-font-smoothing: antialiased;
          }

          /* wallet-connect doesn't like our white body text */
          #walletconnect-wrapper {
            color: black;
          }

          ::selection {
            background: #fff;
            color: black;
            border-radius: 8px;
          }
        `}
      />

      <Phosphor>
        <Api>{canView ? <Main /> : <Maintenance />}</Api>
      </Phosphor>
    </>
  )
}

function Main() {
  return (
    <Auth>
      <Routes>
        <Route path='/' exact element={isSDK ? <World slug={env.DEFAULT_WORLD} /> : <Home2 />} />
        {isLive && (
          <>
            <Route path='/worlds' element={<Worlds />} />
            <Route path='/link' element={<LinkWallet />} />
            <Route path='/auth/:authHookId' element={<AuthHook />} />
            {/* <Route path="/explore" element={<Explore />} /> */}
            <Route path='/gs' element={<GameServers />} />
            <Route path='/:slug' element={<World />} />
            <Route path='/:slug/:shard' element={<World />} />
          </>
        )}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </Auth>
  )
}

function Maintenance() {
  const { height } = useViewport()
  return (
    <div
      className='Maintenance'
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: ${height}px;
        padding: 20px;
        .Maintenance__content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .Maintenance__logo {
          margin: 0 0 20px;
        }
        .Maintenance__title {
          font-size: 18px;
          font-weight: 500;
          margin: 0 0 8px;
          text-align: center;
        }
        .Maintenance__text {
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
        }
      `}
    >
      <div className='Maintenance__content'>
        <LogoIcon className='Maintenance__logo' size={40} />
        <div className='Maintenance__title'>Down for maintenance</div>
        <div className='Maintenance__text'>We'll be back as soon as possible</div>
      </div>
    </div>
  )
}
